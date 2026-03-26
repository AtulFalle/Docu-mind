const target = process.env.API_TARGET || 'http://localhost:3000';

module.exports = {
  "/api": {
    "target": target,
    "secure": false,
    "pathRewrite": {
      "^/api": "/api"
    }
  }
};
