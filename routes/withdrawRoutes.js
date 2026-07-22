const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Withdraw = require("../models/Withdraw");
const Notification = require("../models/Notification");


/* CREATE WITHDRAW */
router.post("/", async (req, res) => {

  try {

    const { seller, amount, method, binanceAccount } = req.body;

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
router.get("/admin/all", async (req, res) => {

  const withdraws =
  await Withdraw.find()
  .sort({ createdAt: -1 });

  res.json(withdraws);

});


/* GET ALL */
router.get("/", async (req, res) => {

  const withdraws =
  await Withdraw.find()
  .sort({ createdAt: -1 });

  res.json(withdraws);

});


/* GET SELLER WITHDRAWS */
router.get("/:seller", async (req, res) => {

  const withdraws =
  await Withdraw.find({
    seller: req.params.seller
  }).sort({ createdAt: -1 });

  res.json(withdraws);

});


/* COMPLETE */
router.put("/:id/complete", async (req, res) => {

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

  res.json({
    success: true,
    message: "Withdraw Completed"
  });

});


/* REJECT */
router.put("/:id/reject", async (req, res) => {

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

  res.json({
    success: true,
    message: "Withdraw Rejected"
  });

  await Notification.create({
  user: withdraw.seller,
  title: "Payment Approved",
  message: "Your payment has been approved"
});

await Notification.create({
  user: withdraw.seller,
  title: "Withdraw Approved",
  message: `$${withdraw.amount} has been approved`
});

await Notification.create({
  user: withdraw.seller,
  title: "Withdraw Rejected",
  message: `$${withdraw.amount} returned to your wallet`
});

});

module.exports = router;