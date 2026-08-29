const { createUploader } = require("./uploadBranding");

module.exports = createUploader("owners", ["png", "jpg", "jpeg", "webp"]);
