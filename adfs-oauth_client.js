Adfsoauth = {};

// Request credentials for the user
// @param options {optional}
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.

Adfsoauth.getDataAfterRedirect = function () {

  console.log('LOGGING FUNCTION: getDataAfterRedirect');

  var credentialSecret, credentialToken;
  for (var k in sessionStorage){
    credentialSecret = sessionStorage[k];
    credentialToken = k.replace(OAuth._storageTokenPrefix, "");
  }
  if (!credentialSecret || !credentialToken)
            return null;

  return {
      loginService: "adfsoauth",
      credentialToken: credentialToken,
      credentialSecret: credentialSecret
  };
}

Adfsoauth.requestCredential = function (options, credentialRequestCompleteCallback) {

  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  } else if (!options) {
    options = {};
  }

  if (typeof Session != 'undefined' && Session.get('companyId') != 'undefined') {
    var config = Companies.findOne({_id: Session.get('companyId')});

    if (!config) {
      credentialRequestCompleteCallback && credentialRequestCompleteCallback(
        new ServiceConfiguration.ConfigError());
      return;
    }

  } else {

    var config = ServiceConfiguration.configurations.findOne({service: 'adfsoauth'});
    if (!config) {
      credentialRequestCompleteCallback && credentialRequestCompleteCallback(
        new ServiceConfiguration.ConfigError());
      return;
    }
  }

  var credentialToken = Random.secret();

  var loginUrlParameters = {};
  if (config.loginUrlParameters){
    _.extend(loginUrlParameters, config.loginUrlParameters)
  }
  if (options.loginUrlParameters){
    _.extend(loginUrlParameters, options.loginUrlParameters)
  }
  var ILLEGAL_PARAMETERS = ['response_type', 'client_id', 'scope', 'redirect_uri', 'state'];
    // validate options keys
  _.each(_.keys(loginUrlParameters), function (key) {
    if (_.contains(ILLEGAL_PARAMETERS, key))
      throw new Error("Adfsoauth.requestCredential: Invalid loginUrlParameter: " + key);
  });

  // backwards compatible options
  if (options.requestOfflineToken != null){
    loginUrlParameters.access_type = options.requestOfflineToken ? 'offline' : 'online'
  }
  if (options.prompt != null) {
    loginUrlParameters.prompt = options.prompt;
  } else if (options.forceApprovalPrompt) {
    loginUrlParameters.prompt = 'consent'
  }

  var loginStyle = OAuth._loginStyle('adfsoauth', config, options);
  _.extend(loginUrlParameters, {
    "response_type": "code",
    "client_id":  config.clientId,
    "resource": config.resource,
    "redirect_uri": config.redirectUrl,
    "state": OAuth._stateParam(loginStyle, credentialToken, options.redirectUrl)
  });
  var loginUrl = config.oauthAdfsUrl + '/authorize?' +
    _.map(loginUrlParameters, function(value, param){
      return encodeURIComponent(param) + '=' + encodeURIComponent(value);
    }).join("&");

  OAuth.launchLogin({
    loginService: "adfsoauth",
    loginStyle: loginStyle,
    loginUrl: loginUrl,
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,
    credentialToken: credentialToken,
    popupOptions: { height: 600 }
  });
};
