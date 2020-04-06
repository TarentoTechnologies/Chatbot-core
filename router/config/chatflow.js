var chatflow = {
    step1: {
        messageKey: "START",
        responseVariable: "userIntent"
    },
    step1_1: {
        messageKey: "CHOOSE_BOARD",
        responseVariable: "userBoard"
    },
    step1_1_1: {
        messageKey: "CBSE_MESSAGE",
        responseVariable: ""
    },
    step1_1_2: {
        messageKey: "CHOOSE_STATE_BOARD",
        responseVariable: "stateBoard"
    },
    step1_1_2_1: {
        messageKey: "TN_BOARD",
        responseVariable: ""
    },
    step1_1_2_2: {
        messageKey: "KA_BOARD",
        responseVariable: ""
    },
    step1_1_2_3: {
        messageKey: "GJ_BOARD",
        responseVariable: ""
    },
    step1_1_2_4: {
        messageKey: "UP_BOARD",
        responseVariable: ""
    },
    step1_2: {
        messageKey: "PLAYSTORE",
        responseVariable: ""
    },
    step1_3: {
        messageKey: "OTHER_OPTIONS",
        responseVariable: "other_options"
    },
    step1_3_1: {
        messageKey: "SCAN_QRCODE",
        responseVariable: ""
    },
    step1_3_2: {
        messageKey: "UNABLE_LOGIN",
        responseVariable: ""
    },
    step1_3_3: {
        messageKey: "OTHERS",
        responseVariable: ""
    }

};

module.exports.chatflow = chatflow;