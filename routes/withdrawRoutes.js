const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Withdraw = require("../models/Withdraw");
const Notification = require("../models/Notification");
const notifyAdmin = require("../utils/notifyAdmin");
const notifyUserByEmail = require("../utils/notifyUserByEmail");
const { verifyToken, requireRole, requireSelfOrAdmin } = require("../middleware/auth");


/*
  CREATE WITHDRAW — must be logged in.

  CRITICAL FIX: this used to take "seller" straight from the
  request body with no check at all. That meant anyone could send
  { seller: "someoneElse", amount: 999 } and it would immediately
  DEDUCT that amount from a completely different person's wallet
  balance, with a withdraw request created in their name. Now the
  seller is forced to be whoever is actually logged in.
*/
router.post("/", verifyToken, async (req, res) => {

  try {

    const { amount, method, binanceAccount } = req.body;

    const seller = req.user.nickname;

    const user = await User.findOne({
      nickname: seller
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const value = Number(amount);

    if (user.wallet < value) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    user.wallet -= value;
    await user.save();

    const withdraw = await Withdraw.create({
      seller,
      amount: value,
      method,
      binanceAccount,
      status: "Pending ⏳"
    });

    await Notification.create({
      user: seller,
      title: "Withdraw Request",
      message: `$${value} request submitted`
    });

    notifyUserByEmail(seller, {
      type: "info",
      title: "Withdraw Request Submitted",
      message: `Your withdrawal request for $${value.toFixed(2)} has been submitted and is waiting for admin review.`,
      details: {
        Amount: `$${value.toFixed(2)}`,
        Method: method || "N/A"
      },
      actionUrl: `${req.protocol}://${req.get("host")}/withdraws`,
      actionLabel: "View Withdraw Status"
    });

    notifyAdmin({
      type: "warning",
      title: "New Withdraw Request",
      message: `${seller} has requested a withdrawal and it's waiting for your review.`,
      details: {
        Seller: seller,
        Amount: `$${value.toFixed(2)}`,
        Method: method || "N/A",
        Account: binanceAccount || "N/A"
      },
      actionUrl: `${req.protocol}://${req.get("host")}/pending-withdraws`,
      actionLabel: "Review Withdraw"
    });

    console.log(
  "New Withdraw Request:",
  seller,
  value
);

    res.json({
      success: true,
      withdraw,
      message: "Withdraw Request Created"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }

});


/* GET ALL (ADMIN) */
router.get("/admin/all", verifyToken, requireRole("admin"), async (req, res) => {

  const withdraws =
  await Withdraw.find()
  .sort({ createdAt: -1 });

  res.json(withdraws);

});


/* GET ALL — admin only */
router.get("/", verifyToken, requireRole("admin"), async (req, res) => {

  const withdraws =
  await Withdraw.find()
  .sort({ createdAt: -1 });

  res.json(withdraws);

});


/* GET SELLER WITHDRAWS — owner or admin */
router.get("/:seller", verifyToken, requireSelfOrAdmin(req => req.params.seller), async (req, res) => {

  const withdraws =
  await Withdraw.find({
    seller: req.params.seller
  }).sort({ createdAt: -1 });

  res.json(withdraws);

});


/* COMPLETE — admin only (moves real money out) */
router.put("/:id/complete", verifyToken, requireRole("admin"), async (req, res) => {

  const withdraw =
  await Withdraw.findById(req.params.id);

  if (!withdraw) {
    return res.status(404).json({
      success: false,
      message: "Withdraw not found"
    });
  }

  if (withdraw.status !== "Pending ⏳") {
    return res.status(400).json({
      success: false,
      message: "Already processed"
    });
  }

  withdraw.status = "Completed ✅";
  await withdraw.save();

  const sellerUser =
  await User.findOne({
    nickname: withdraw.seller
  });

  if (sellerUser) {

  console.log(
    "Withdraw Approved:",
    sellerUser.nickname
  );

}

  await Notification.create({
    user: withdraw.seller,
    title: "Withdraw Approved",
    message: `$${withdraw.amount} has been approved`
  });

  notifyUserByEmail(withdraw.seller, {
    type: "success",
    title: "Withdraw Approved 🎉",
    message: `Your withdrawal of $${Number(withdraw.amount).toFixed(2)} has been approved and completed.`,
    details: {
      Amount: `$${Number(withdraw.amount).toFixed(2)}`,
      Method: withdraw.method || "N/A"
    }
  });

  notifyAdmin({
    type: "success",
    title: "Withdraw Completed",
    message: `The withdrawal for ${withdraw.seller} has been marked as completed.`,
    details: {
      Seller: withdraw.seller,
      Amount: `$${Number(withdraw.amount).toFixed(2)}`,
      Method: withdraw.method || "N/A"
    }
  });

  res.json({
    success: true,
    message: "Withdraw Completed"
  });

});


/* REJECT — admin only (refunds the wallet) */
router.put("/:id/reject", verifyToken, requireRole("admin"), async (req, res) => {

  const withdraw =
  await Withdraw.findById(req.params.id);

  if (!withdraw) {
    return res.status(404).json({
      success: false,
      message: "Withdraw not found"
    });
  }

  if (withdraw.status !== "Pending ⏳") {
    return res.status(400).json({
      success: false,
      message: "Already processed"
    });
  }

  const user =
  await User.findOne({
    nickname: withdraw.seller
  });

  if (user) {

  user.wallet += Number(withdraw.amount);
  await user.save();

  console.log(
    "Withdraw Rejected:",
    user.nickname
  );

}

  withdraw.status = "Rejected ❌";
  await withdraw.save();

  await Notification.create({
    user: withdraw.seller,
    title: "Withdraw Rejected",
    message: `$${withdraw.amount} returned to your wallet`
  });

  notifyUserByEmail(withdraw.seller, {
    type: "danger",
    title: "Withdraw Rejected",
    message: `Your withdrawal request for $${Number(withdraw.amount).toFixed(2)} was rejected. The amount has been returned to your wallet.`,
    details: {
      Amount: `$${Number(withdraw.amount).toFixed(2)}`
    }
  });

  notifyAdmin({
    type: "info",
    title: "Withdraw Rejected",
    message: `The withdrawal for ${withdraw.seller} was rejected and the amount was returned to their wallet.`,
    details: {
      Seller: withdraw.seller,
      Amount: `$${Number(withdraw.amount).toFixed(2)}`
    }
  });

  res.json({
    success: true,
    message: "Withdraw Rejected"
  });

});

module.exports = router;
