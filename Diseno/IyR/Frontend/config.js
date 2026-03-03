(function bootstrapCerebroConfig(globalObject) {
  var runtimeBaseUrl = globalObject.CEREBRO_API_BASE_URL;
  var apiBaseUrl =
    typeof runtimeBaseUrl === "string" && runtimeBaseUrl.trim() !== ""
      ? runtimeBaseUrl.trim().replace(/\/+$/, "")
      : "/api";

  globalObject.CEREBRO_CONFIG = Object.freeze({
    API_BASE_URL: apiBaseUrl,
    AUTH_STORAGE_KEY: "cerebro_auth_session",
  });
})(window);
