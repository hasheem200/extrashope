const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({

    commission: {
        type: Number,
        default: 10
    },

    adsRevenue: {
    type: Number,
    default: 0
    },

    adminWallet: {
        type: Number,
        default: 0
    },

    bannerPrices:{

    top:{
        type:Number,
        default:5
    },

    long:{
        type:Number,
        default:4
    },

    large:{
        type:Number,
        default:3
    },

    rectangle:{
        type:Number,
        default:2
    },

    mobile:{
        type:Number,
        default:1
    }

},

paymentSettings:{

    name:{
        type:String,
        default:"Binance"
    },

    description:{
        type:String,
        default:"Send payment using USDT (BEP20)"
    },

    account:{
        type:String,
        default:"0xA1B2C3D4E5F67890ABCDEF1234567890"
    },

    network:{
        type:String,
        default:"BEP20"
    },

    buttonText:{
        type:String,
        default:"Copy"
    },

    logo:{
        type:String,
        default:""
    },

    qr:{
        type:String,
        default:""
    }

},
    
siteSettings:{

    siteName:{
    type:String,
    default:"ExtraShope"
    },

    siteIcon: {  // ✅ جديد
        type: String,
        default: "🛒"
    },

    siteTitle:{
    type:String,
    default:"$MODULE_NAME$ - ExtraShope"
    },

    siteUrl:{
    type:String,
    default:"https://extrashope.com"
    },

    metaDescription:{
    type:String,
    default:""
    },

metaKeywords:{
type:String,
default:""
},

adsense:{
type:String,
default:""
},

analytics:{
type:String,
default:""
},



favicon:{
type:String,
default:""
},

appleIcon:{
type:String,
default:""
},

tileImage:{
type:String,
default:""
},

headHtml:{
type:String,
default:""
},

footerHtml:{
type:String,
default:""
},

smtpUser:{
type:String,
default:""
},

smtpPass:{
type:String,
default:""
},


senderName:{
type:String,
default:"ExtraShope"
}

},
// ===== خارج siteSettings =====

storageSettings:{

    storageType:{
        type:String,
        default:"local"
    },

    cloudName:String,

    cloudApiKey:String,

    cloudApiSecret:String,

    cloudPreset:String

},


});



module.exports = mongoose.model("Settings", settingsSchema);