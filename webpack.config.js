const path = require("path");

module.exports = {
    entry: "./src/index.js",
    mode: "production",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "tagly.min.js",
        library: "Tagly",
        libraryTarget: "umd"
    }
}