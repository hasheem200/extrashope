const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const { verifyToken, requireSelfOrAdmin } = require("../middleware/auth");

/* GET USER NOTIFICATIONS — owner or admin only */

router.get("/:user", verifyToken, requireSelfOrAdmin(req => req.params.user), async (req, res) => {

  const notifications =
  await Notification.find({

    user: req.params.user

  }).sort({ createdAt: -1 });

  res.json(notifications);

});

router.put("/read/:user", verifyToken, requireSelfOrAdmin(req => req.params.user), async (req,res)=>{

  await Notification.updateMany(
    {
      user:req.params.user,
      read:false
    },
    {
      read:true
    }
  );

  res.json({
    success:true
  });

});

module.exports = router;
