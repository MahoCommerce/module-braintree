/**
 * Maho Braintree class to bridge the v.zero JS SDK and Maho
 *
 * @class vZero
 */
class vZero {
    /**
     * Initialize all required variables
     *
     * @param {string} code The payment methods code
     * @param {string|boolean} clientToken The client token provided by the server
     * @param {boolean} threeDSecure Flag to determine whether 3D secure is active
     * @param {boolean} hostedFields Flag to determine whether we're using hosted fields
     * @param {string} billingName Billing name used in verification of the card
     * @param {string} billingPostcode Billing postcode also needed to verify the card
     * @param {string} quoteUrl The URL to update the quote totals
     * @param {string} tokenizeUrl The URL to re-tokenize 3D secure cards
     * @param {string} clientTokenUrl Ajax end point to retrieve client token
     */
    constructor(code, clientToken, threeDSecure, hostedFields, billingName, billingPostcode, quoteUrl, tokenizeUrl, clientTokenUrl) {
        this.code = code;
        this.clientToken = clientToken || false;
        this.clientTokenUrl = clientTokenUrl;
        this.threeDSecure = threeDSecure;
        this.hostedFields = hostedFields;

        if (billingName) {
            this.billingName = billingName;
        }
        if (billingPostcode) {
            this.billingPostcode = billingPostcode;
        }
        this.billingCountryId = false;
        if (quoteUrl) {
            this.quoteUrl = quoteUrl;
        }
        if (tokenizeUrl) {
            this.tokenizeUrl = tokenizeUrl;
        }

        this._hostedFieldsTokenGenerated = false;
        this.acceptedCards = false;
        this._hostedFieldsTimeout = false;
        this._updateDataCallbacks = [];
        this._updateDataTimeout = null;
        this.client = false;
        this.threeDSpecificCountries = false;
        this.threeDCountries = [];
        this.threeDSecureFailedAction = 0;
        this.supportedCards = [];
        this.cardType = false;
        this._hostedIntegration = false;

        this.initEvents();
    }

    /**
     * Create events object with various supported events
     */
    initEvents() {
        this.events = {
            onBeforeUpdateData: [],
            onAfterUpdateData: [],
            onHandleAjaxRequest: [],
            integration: {
                onInit: [],
                onInitDefaultMethod: [],
                onInitSavedMethods: [],
                onShowHideOtherMethod: [],
                onCheckSavedOther: [],
                onPaymentMethodSwitch: [],
                onReviewInit: [],
                onBeforeSubmit: [],
                onAfterSubmit: [],
                onObserveAjaxRequests: []
            }
        };
    }

    /**
     * Set the Kount data for the data collector
     *
     * @param {string} environment
     * @param {string} kountId
     */
    setKount(environment, kountId) {
        this.kountEnvironment = environment;
        if (kountId !== '') {
            this.kountId = kountId;
        }
    }

    /**
     * Set the supported card types
     *
     * @param {string|Array} cardTypes
     */
    setSupportedCards(cardTypes) {
        if (typeof cardTypes === 'string') {
            cardTypes = cardTypes.split(',');
        }
        this.supportedCards = cardTypes;
    }

    /**
     * Set the 3D secure specific countries
     *
     * @param {string|Array} countries
     */
    setThreeDCountries(countries) {
        if (typeof countries === 'string') {
            countries = countries.split(',');
        }
        this.threeDSpecificCountries = true;
        this.threeDCountries = countries;
    }

    /**
     * Set the action to occur when a 3Ds transactions liability doesn't shift
     *
     * @param {number} action
     */
    setThreeDFailedAction(action) {
        this.threeDSecureFailedAction = action;
    }

    /**
     * Add an event into the system
     *
     * @param {string|Array} paths
     * @param {Function} eventFn
     * @param {Object} params
     */
    observeEvent(paths, eventFn, params) {
        if (!Array.isArray(paths)) {
            paths = [paths];
        }

        paths.forEach((path) => {
            const event = this._resolveEvent(path);
            if (event === undefined) {
                console.warn('Event for ' + path + ' does not exist.');
            } else {
                event.push({ fn: eventFn, params: params });
            }
        });
    }

    /**
     * Fire an event
     *
     * @param {Object} caller
     * @param {string} path
     * @param {Object} params
     */
    fireEvent(caller, path, params) {
        const events = this._resolveEvent(path);
        if (events !== undefined && events.length > 0) {
            events.forEach((event) => {
                if (typeof event.fn === 'function') {
                    const args = [params];
                    if (typeof event.params === 'object') {
                        args.push(event.params);
                    }
                    event.fn.apply(caller, args);
                }
            });
        }
    }

    /**
     * Resolve an event by a path
     *
     * @param {string} path
     * @returns {*}
     * @private
     */
    _resolveEvent(path) {
        return path.split('.').reduce((prev, curr) => {
            return prev ? prev[curr] : undefined;
        }, this.events);
    }

    /**
     * Retrieve the client token
     *
     * @param {Function} callbackFn
     * @returns {*}
     */
    async getClientToken(callbackFn) {
        if (this.clientToken !== false) {
            return callbackFn(this.clientToken);
        } else if (window.braintreeClientToken) {
            return callbackFn(window.braintreeClientToken);
        } else {
            try {
                const response = await mahoFetch(this.clientTokenUrl, {
                    method: 'GET',
                    loaderArea: false
                });
                if (response.success === true && typeof response.client_token === 'string') {
                    this.clientToken = response.client_token;
                    window.braintreeClientToken = response.client_token;
                    return callbackFn(this.clientToken);
                } else {
                    console.error('We were unable to retrieve a client token from the server to initialize the Braintree flow.');
                    if (response.error) {
                        console.error(response.error);
                    }
                }
            } catch (error) {
                console.error('We were unable to retrieve a client token from the server to initialize the Braintree flow.');
            }
        }
    }

    /**
     * Retrieve the client from the class, or initialize if not already present
     *
     * @param {Function} callbackFn
     */
    getClient(callbackFn) {
        if (this.client !== false) {
            if (typeof callbackFn === 'function') {
                callbackFn(this.client);
            }
        } else {
            this.getClientToken((clientToken) => {
                braintree.client.create({
                    authorization: clientToken
                }, (clientErr, clientInstance) => {
                    if (clientErr) {
                        console.error(clientErr);
                        return;
                    }
                    this.client = clientInstance;
                    callbackFn(this.client);
                });
            });
        }
    }

    /**
     * Init the hosted fields system
     *
     * @param {Object} integration
     */
    initHostedFields(integration) {
        if (document.querySelectorAll('iframe[name^="braintree-"]').length > 0) {
            return false;
        }

        const submitBtn = document.getElementById('braintree-hosted-submit');
        if (submitBtn === null) {
            return false;
        }

        this.integration = integration;
        this._hostedFieldsTokenGenerated = false;

        clearTimeout(this._hostedFieldsTimeout);
        this._hostedFieldsTimeout = setTimeout(() => {
            if (this._hostedIntegration !== false) {
                try {
                    this._hostedIntegration.teardown(() => {
                        this._hostedIntegration = false;
                        this.setupHostedFieldsClient();
                    });
                } catch (e) {
                    this.setupHostedFieldsClient();
                }
            } else {
                this.setupHostedFieldsClient();
            }
        }, 50);
    }

    /**
     * Tear down hosted fields
     *
     * @param {Function} callbackFn
     */
    teardownHostedFields(callbackFn) {
        if (typeof this._hostedIntegration !== 'undefined' && this._hostedIntegration !== false) {
            this._hostedIntegration.teardown(() => {
                this._hostedIntegration = false;
                if (typeof callbackFn === 'function') {
                    callbackFn();
                }
            });
        } else {
            if (typeof callbackFn === 'function') {
                callbackFn();
            }
        }
    }

    /**
     * Setup the hosted fields client utilising the Braintree JS SDK
     */
    setupHostedFieldsClient() {
        if (document.querySelectorAll('iframe[name^="braintree-"]').length > 0) {
            return false;
        }

        this._hostedIntegration = false;
        this.checkSubmitAfterPayment();

        this.getClient((clientInstance) => {
            const options = {
                client: clientInstance,
                styles: this.getHostedFieldsStyles(),
                fields: {
                    number: {
                        selector: "#card-number",
                        placeholder: "0000 0000 0000 0000"
                    },
                    expirationMonth: {
                        selector: "#expiration-month",
                        placeholder: "MM"
                    },
                    expirationYear: {
                        selector: "#expiration-year",
                        placeholder: "YY"
                    }
                }
            };

            const cvvField = document.getElementById('cvv');
            if (cvvField !== null) {
                options.fields.cvv = {
                    selector: "#cvv"
                };
            }

            braintree.hostedFields.create(options, (hostedFieldsErr, hostedFieldsInstance) => {
                if (hostedFieldsErr) {
                    if (hostedFieldsErr.code === 'HOSTED_FIELDS_FIELD_DUPLICATE_IFRAME') {
                        return;
                    }
                    console.error(hostedFieldsErr);
                    return;
                }
                return this.hostedFieldsOnReady(hostedFieldsInstance);
            });
        });
    }

    /**
     * Called when Hosted Fields integration is ready
     *
     * @param {Object} integration
     */
    hostedFieldsOnReady(integration) {
        this._hostedIntegration = integration;

        const loadingForm = document.querySelector('#credit-card-form.loading');
        if (loadingForm) {
            loadingForm.classList.remove('loading');
        }

        this.checkSubmitAfterPayment();
        integration.on('cardTypeChange', this.hostedFieldsCardTypeChange.bind(this));
    }

    /**
     * Check if the submit after payment should be present on the page
     */
    checkSubmitAfterPayment() {
        const paymentForm = document.getElementById('payment_form_gene_braintree_creditcard');
        if (this.integration.submitAfterPayment) {
            if (document.getElementById('braintree-submit-after-payment') === null && paymentForm) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'payment[submit_after_payment]';
                input.value = '1';
                input.id = 'braintree-submit-after-payment';
                paymentForm.appendChild(input);
            }
        } else {
            const submitAfterPayment = document.getElementById('braintree-submit-after-payment');
            if (submitAfterPayment) {
                submitAfterPayment.remove();
            }
        }
    }

    /**
     * Return the hosted field styles
     *
     * @returns {Object}
     */
    getHostedFieldsStyles() {
        if (typeof this.integration.getHostedFieldsStyles === 'function') {
            return this.integration.getHostedFieldsStyles();
        }

        return {
            "input": {
                "font-size": "14pt",
                "color": "#3A3A3A"
            },
            ":focus": {
                "color": "black"
            },
            ".valid": {
                "color": "green"
            },
            ".invalid": {
                "color": "red"
            }
        };
    }

    /**
     * Update the card type on field event
     *
     * @param {Object} event
     */
    hostedFieldsCardTypeChange(event) {
        if (typeof event.cards !== 'undefined') {
            const cardMapping = {
                'visa': 'VI',
                'american-express': 'AE',
                'master-card': 'MC',
                'discover': 'DI',
                'jcb': 'JCB',
                'maestro': 'ME'
            };
            if (typeof cardMapping[event.cards[0].type] !== 'undefined') {
                this.cardType = cardMapping[event.cards[0].type];
                this.updateCardType(false, this.cardType);

                if (this.supportedCards.indexOf(this.cardType) === -1) {
                    this.showCardUnsupported();
                } else {
                    this.removeCardUnsupported();
                }
            } else {
                this.removeCardUnsupported();
                this.cardType = false;
                this.updateCardType(false, 'card');
            }
        }
    }

    /**
     * Show the card unsupported message by the card field
     */
    showCardUnsupported() {
        const cardInput = document.querySelector('.braintree-card-input-field');
        if (cardInput) {
            const parentElement = cardInput.parentElement;
            if (!parentElement.querySelector('.braintree-card-unsupported')) {
                const error = document.createElement('div');
                error.className = 'braintree-card-unsupported';
                error.textContent = Translator.translate('We\'re currently unable to process this card type, please try another card or payment method.');
                parentElement.appendChild(error);
            }
        }
    }

    /**
     * Remove the card unsupported message
     */
    removeCardUnsupported() {
        document.querySelectorAll('.braintree-card-unsupported').forEach((ele) => {
            ele.remove();
        });
    }

    /**
     * Retrieve the billing country ID
     *
     * @returns {string|boolean}
     */
    getBillingCountryId() {
        const billingSelect = document.getElementById('billing-address-select');
        if (billingSelect === null || billingSelect.value === '') {
            const billing = this.getBillingAddress();
            if (typeof billing['billing[country_id]'] !== 'undefined') {
                return billing['billing[country_id]'];
            }
        }

        if (this.billingCountryId) {
            return this.billingCountryId;
        }

        return false;
    }

    /**
     * Should we invoke the 3Ds flow
     *
     * @returns {boolean}
     */
    shouldInvokeThreeDSecure() {
        if (this.threeDSpecificCountries && this.threeDCountries.length > 0) {
            const countryId = this.getBillingCountryId();
            if (countryId) {
                return this.threeDCountries.indexOf(countryId) !== -1;
            }
        }
        return this.threeDSecure;
    }

    /**
     * Once the nonce has been received update the field
     *
     * @param {Object} payload
     * @param {Object} options
     */
    hostedFieldsNonceReceived(payload, options) {
        if (this.shouldInvokeThreeDSecure()) {
            if (typeof this.integration.setLoading === 'function') {
                this.integration.setLoading();
            }

            this.verify3dSecureNonce(payload.nonce, {
                onSuccess: (response) => {
                    this.updateNonce(response.nonce);
                    if (typeof options.onSuccess === 'function') {
                        options.onSuccess();
                    }
                },
                onFailure: () => {
                    if (typeof options.onFailure === 'function') {
                        options.onFailure();
                    }
                }
            });
        } else {
            this.updateNonce(payload.nonce);
            if (typeof options.onSuccess === 'function') {
                options.onSuccess();
            }
        }
    }

    /**
     * Update the nonce in the form
     *
     * @param {string} nonce
     */
    updateNonce(nonce) {
        const nonceField = document.getElementById('creditcard-payment-nonce');
        if (nonceField) {
            nonceField.value = nonce;
            nonceField.setAttribute('value', nonce);
        }

        if (typeof this.integration.resetLoading === 'function') {
            this.integration.resetLoading();
        }

        this._hostedFieldsTokenGenerated = true;
    }

    /**
     * Handle hosted fields throwing an error
     *
     * @param {Object} response
     * @returns {boolean}
     */
    hostedFieldsError(response) {
        if (typeof this.integration.resetLoading === 'function') {
            this.integration.resetLoading();
        }

        if (
            typeof response.message !== 'undefined' &&
            response.message.indexOf('Cannot place two elements in') === -1 &&
            response.message.indexOf('Unable to find element with selector') === -1 &&
            response.message.indexOf('User did not enter a payment method') === -1
        ) {
            alert(response.message);
        }

        this._hostedFieldsTokenGenerated = false;

        if (typeof this.integration.afterHostedFieldsError === 'function') {
            this.integration.afterHostedFieldsError(response.message);
        }

        return false;
    }

    /**
     * Is the customer attempting to use a saved card?
     *
     * @returns {boolean}
     */
    usingSavedCard() {
        const savedAccounts = document.getElementById('creditcard-saved-accounts');
        const checkedRadio = document.querySelector('#creditcard-saved-accounts input:checked[type=radio]');
        return (savedAccounts !== null && checkedRadio !== null && checkedRadio.value !== 'other');
    }

    /**
     * Detect a saved card with 3Ds enabled
     *
     * @returns {boolean}
     */
    usingSavedThreeDCard() {
        const checkedRadio = document.querySelector('#creditcard-saved-accounts input:checked[type=radio]');
        return this.usingSavedCard() && checkedRadio && checkedRadio.hasAttribute('data-threedsecure-nonce');
    }

    /**
     * Set the 3Ds flag
     *
     * @param {boolean} flag
     */
    setThreeDSecure(flag) {
        this.threeDSecure = flag;
    }

    /**
     * Set the amount within the checkout
     *
     * @param {number|string} amount
     */
    setAmount(amount) {
        this.amount = parseFloat(amount);
    }

    /**
     * Set the billing name
     *
     * @param {string} billingName
     */
    setBillingName(billingName) {
        this.billingName = billingName;
    }

    /**
     * Return the billing name
     *
     * @returns {string}
     */
    getBillingName() {
        if (typeof this.billingName === 'object') {
            return this.combineElementsValues(this.billingName);
        } else {
            return this.billingName;
        }
    }

    /**
     * Set billing postcode
     *
     * @param {string} billingPostcode
     */
    setBillingPostcode(billingPostcode) {
        this.billingPostcode = billingPostcode;
    }

    /**
     * Return the billing post code
     *
     * @returns {string|null}
     */
    getBillingPostcode() {
        if (typeof this.billingPostcode === 'string') {
            return this.billingPostcode;
        } else if (typeof this.billingPostcode === 'object') {
            return this.combineElementsValues(this.billingPostcode);
        } else {
            const billing = this.getBillingAddress();
            if (typeof billing['billing[postcode]'] !== 'undefined') {
                return billing['billing[postcode]'];
            }
            return null;
        }
    }

    /**
     * Push through the selected accepted cards from the admin
     *
     * @param {Array} cards
     */
    setAcceptedCards(cards) {
        this.acceptedCards = cards;
    }

    /**
     * Return the full billing address
     *
     * @returns {Object}
     */
    getBillingAddress() {
        if (typeof this.integration.getBillingAddress === 'function') {
            return this.integration.getBillingAddress();
        }

        let billingAddress = {};
        const coBillingForm = document.getElementById('co-billing-form');
        const billingFirstname = document.getElementById('billing:firstname');

        if (coBillingForm !== null) {
            if (coBillingForm.tagName === 'FORM') {
                billingAddress = this._serializeForm(coBillingForm);
            } else {
                const parentForm = coBillingForm.closest('form');
                if (parentForm) {
                    billingAddress = this.extractBilling(this._serializeForm(parentForm));
                }
            }
        } else if (billingFirstname !== null) {
            const parentForm = billingFirstname.closest('form');
            if (parentForm) {
                billingAddress = this.extractBilling(this._serializeForm(parentForm));
            }
        }

        return billingAddress;
    }

    /**
     * Extract only the serialized values that start with "billing"
     *
     * @param {Object} formData
     * @returns {Object}
     */
    extractBilling(formData) {
        const billing = {};
        Object.entries(formData).forEach(([key, value]) => {
            if (key.indexOf('billing') === 0 && key.indexOf('password') === -1) {
                billing[key] = value;
            }
        });
        return billing;
    }

    /**
     * Return the full shipping address
     *
     * @returns {Object}
     */
    getShippingAddress() {
        if (typeof this.integration.getShippingAddress === 'function') {
            return this.integration.getShippingAddress();
        }

        let shippingAddress = {};
        const coShippingForm = document.getElementById('co-shipping-form');
        const shippingFirstname = document.getElementById('shipping:firstname');

        if (coShippingForm !== null) {
            if (coShippingForm.tagName === 'FORM') {
                shippingAddress = this._serializeForm(coShippingForm);
            } else {
                const parentForm = coShippingForm.closest('form');
                if (parentForm) {
                    shippingAddress = this.extractShipping(this._serializeForm(parentForm));
                }
            }
        } else if (shippingFirstname !== null) {
            const parentForm = shippingFirstname.closest('form');
            if (parentForm) {
                shippingAddress = this.extractShipping(this._serializeForm(parentForm));
            }
        }

        return shippingAddress;
    }

    /**
     * Extract only the serialized values that start with "shipping"
     *
     * @param {Object} formData
     * @returns {Object}
     */
    extractShipping(formData) {
        const shipping = {};
        Object.entries(formData).forEach(([key, value]) => {
            if (key.indexOf('shipping') === 0 && key.indexOf('password') === -1) {
                shipping[key] = value;
            }
        });
        return shipping;
    }

    /**
     * Serialize form to object (replacement for Prototype's serialize(true))
     *
     * @param {HTMLFormElement} form
     * @returns {Object}
     * @private
     */
    _serializeForm(form) {
        const result = {};
        const formData = new FormData(form);

        for (const [key, value] of formData.entries()) {
            if (result[key]) {
                if (!Array.isArray(result[key])) {
                    result[key] = [result[key]];
                }
                result[key].push(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    /**
     * Return the accepted cards
     *
     * @returns {boolean|Array}
     */
    getAcceptedCards() {
        return this.acceptedCards;
    }

    /**
     * Combine elements values into a string
     *
     * @param {Array} elements
     * @param {string} separator
     * @returns {string}
     */
    combineElementsValues(elements, separator) {
        if (!separator) {
            separator = ' ';
        }

        const response = [];
        elements.forEach((elementId, index) => {
            const element = document.getElementById(elementId);
            if (element) {
                response[index] = element.value;
            }
        });

        return response.join(separator);
    }

    /**
     * Update the card type from a card number
     *
     * @param {string|boolean} cardNumber
     * @param {string} cardType
     */
    updateCardType(cardNumber, cardType) {
        const cardTypeImage = document.getElementById('card-type-image');
        if (cardTypeImage) {
            const skinImageUrl = cardTypeImage.src.substring(0, cardTypeImage.src.lastIndexOf("/"));
            cardTypeImage.setAttribute('src', skinImageUrl + "/" + cardType + ".png");
        }
    }

    /**
     * Observe all Ajax requests
     *
     * @param {Function} callback
     * @param {Array} ignore
     */
    observeAjaxRequests(callback, ignore) {
        if (vZero.observingAjaxRequests) {
            return false;
        }
        vZero.observingAjaxRequests = true;

        // Override native fetch
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch.apply(window, args);
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            this.handleAjaxRequest(url, callback, ignore);
            return response;
        };

        // Override XMLHttpRequest for legacy code
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._url = url;
            return originalXHROpen.apply(this, [method, url, ...rest]);
        };

        const originalXHRSend = XMLHttpRequest.prototype.send;
        const self = this;
        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener('load', function() {
                self.handleAjaxRequest(this._url, callback, ignore);
            });
            return originalXHRSend.apply(this, args);
        };

        // jQuery support
        if (window.jQuery) {
            jQuery(document).ajaxComplete((event, xhr, settings) => {
                return this.handleAjaxRequest(settings.url, callback, ignore);
            });
        }
    }

    /**
     * Handle the ajax request from the observer
     *
     * @param {string} url
     * @param {Function} callback
     * @param {Array} ignore
     * @returns {boolean}
     */
    handleAjaxRequest(url, callback, ignore) {
        if (typeof ignore !== 'undefined' && Array.isArray(ignore) && ignore.length > 0) {
            let shouldIgnore = false;
            ignore.forEach((element) => {
                if (url && url.indexOf(element) !== -1) {
                    shouldIgnore = true;
                }
            });

            if (shouldIgnore === true) {
                return false;
            }
        }

        if (url && url.indexOf('/braintree/') === -1) {
            this.fireEvent(this, 'onHandleAjaxRequest', { url: url });

            if (callback) {
                callback(url);
            } else {
                this.updateData();
            }
        }
    }

    /**
     * Make an Ajax request to the server for quote information
     *
     * @param {Function} callback
     * @param {Object} params
     */
    updateData(callback, params) {
        this._updateDataCallbacks.push(callback);

        clearTimeout(this._updateDataTimeout);
        this._updateDataTimeout = setTimeout(async () => {
            const callbacks = this._updateDataCallbacks;
            this._updateDataCallbacks = [];

            this.fireEvent(this, 'onBeforeUpdateData', { params: params });

            try {
                const body = new URLSearchParams(params || {});
                const response = await mahoFetch(this.quoteUrl, {
                    method: 'POST',
                    body: body,
                    loaderArea: false
                });

                if (response.billingName !== undefined) {
                    this.billingName = response.billingName;
                }
                if (response.billingPostcode !== undefined) {
                    this.billingPostcode = response.billingPostcode;
                }
                if (response.billingCountryId !== undefined) {
                    this.billingCountryId = response.billingCountryId;
                }
                if (response.grandTotal !== undefined) {
                    this.amount = response.grandTotal;
                }
                if (response.threeDSecure !== undefined) {
                    this.setThreeDSecure(response.threeDSecure);
                }

                if (typeof vzeroPaypal !== "undefined") {
                    if (response.grandTotal !== undefined && response.currencyCode !== undefined) {
                        vzeroPaypal.setPricing(response.grandTotal, response.currencyCode);
                    }
                }

                if (callbacks.length > 0) {
                    callbacks.forEach((cb) => {
                        if (typeof cb === 'function') {
                            cb(response);
                        }
                    });
                }

                this.fireEvent(this, 'onAfterUpdateData', { response: response });
            } catch (error) {
                console.error('Update data failed:', error);
            }
        }, 250);
    }

    /**
     * Tokenize 3D secure saved cards
     *
     * @param {Function} callback
     */
    async tokenize3dSavedCards(callback) {
        if (!this.threeDSecure) {
            callback();
            return;
        }

        const tokenElements = document.querySelectorAll('[data-token]');
        if (tokenElements.length === 0) {
            callback();
            return;
        }

        const tokens = Array.from(tokenElements).map((el) => el.getAttribute('data-token'));

        try {
            const body = new URLSearchParams({ tokens: JSON.stringify(tokens) });
            const response = await mahoFetch(this.tokenizeUrl, {
                method: 'POST',
                body: body,
                loaderArea: false
            });

            if (response.success) {
                Object.entries(response.tokens).forEach(([key, value]) => {
                    const element = document.querySelector('[data-token="' + key + '"]');
                    if (element) {
                        element.setAttribute('data-threedsecure-nonce', value);
                    }
                });
            }

            if (callback) {
                callback(response);
            }
        } catch (error) {
            console.error('Tokenize 3D saved cards failed:', error);
            callback();
        }
    }

    /**
     * Verify a nonce through 3ds
     *
     * @param {string} nonce
     * @param {Object} options
     */
    verify3dSecureNonce(nonce, options) {
        this.getClient((clientInstance) => {
            braintree.threeDSecure.create({
                version: 2,
                client: clientInstance
            }, (threeDSecureError, threeDSecureInstance) => {
                if (threeDSecureError) {
                    console.error(threeDSecureError);
                    return;
                }

                const billingAddressDetails = this.getBillingAddress();
                const shippingAddressDetails = this.getShippingAddress();

                const billingAddress = {
                    givenName: billingAddressDetails['billing[firstname]'],
                    surname: billingAddressDetails['billing[lastname]'],
                    phoneNumber: billingAddressDetails['billing[telephone]'] || '',
                    streetAddress: typeof billingAddressDetails['billing[street][]'] !== 'undefined' ? billingAddressDetails['billing[street][]'][0] : billingAddressDetails['billing[street][0]'],
                    extendedAddress: (typeof billingAddressDetails['billing[street][]'] !== 'undefined' ? billingAddressDetails['billing[street][]'][1] : billingAddressDetails['billing[street][1]']) || '',
                    locality: billingAddressDetails['billing[city]'],
                    region: billingAddressDetails['billing[region]'] || '',
                    postalCode: billingAddressDetails['billing[postcode]'],
                    countryCodeAlpha2: billingAddressDetails['billing[country_id]']
                };

                let additionalInformation = null;
                if (Object.keys(shippingAddressDetails).length > 0) {
                    additionalInformation = {
                        shippingGivenName: shippingAddressDetails['shipping[firstname]'],
                        shippingSurname: shippingAddressDetails['shipping[lastname]'],
                        shippingPhone: shippingAddressDetails['shipping[telephone]'] || '',
                        shippingAddress: {
                            streetAddress: typeof shippingAddressDetails['shipping[street][]'] !== 'undefined' ? shippingAddressDetails['shipping[street][]'][0] : shippingAddressDetails['shipping[street][0]'],
                            extendedAddress: (typeof shippingAddressDetails['shipping[street][]'] !== 'undefined' ? shippingAddressDetails['shipping[street][]'][1] : shippingAddressDetails['shipping[street][1]']) || '',
                            locality: shippingAddressDetails['shipping[city]'],
                            region: shippingAddressDetails['shipping[region]'] || '',
                            postalCode: shippingAddressDetails['shipping[postcode]'],
                            countryCodeAlpha2: shippingAddressDetails['shipping[country_id]']
                        }
                    };
                }

                const verifyOptions = {
                    amount: this.amount,
                    nonce: nonce,
                    billingAddress: billingAddress,
                    additionalInformation: additionalInformation,
                    onLookupComplete: (data, next) => {
                        next();
                    },
                    addFrame: (err, iframe) => {
                        const modalBody = document.querySelector('#three-d-modal .bt-modal-body');
                        if (modalBody) {
                            modalBody.appendChild(iframe);
                        }
                        const modal = document.getElementById('three-d-modal');
                        if (modal) {
                            modal.classList.remove('hidden');
                        }
                    },
                    removeFrame: () => {
                        const iframe = document.querySelector('#three-d-modal .bt-modal-body iframe');
                        if (iframe) {
                            iframe.remove();
                        }
                        const modal = document.getElementById('three-d-modal');
                        if (modal) {
                            modal.classList.add('hidden');
                        }
                    }
                };

                threeDSecureInstance.verifyCard(verifyOptions, (verifyError, payload) => {
                    if (!verifyError) {
                        if (payload.liabilityShifted) {
                            if (options.onSuccess) {
                                options.onSuccess(payload);
                            }
                        } else {
                            if (this.cardType === "AE") {
                                if (options.onSuccess) {
                                    options.onSuccess(payload);
                                }
                            } else if (this.threeDSecureFailedAction === 1) {
                                if (options.onFailure) {
                                    options.onFailure(
                                        payload,
                                        Translator.translate('Your payment has failed 3D secure verification, please try an alternate payment method.')
                                    );
                                }
                            } else {
                                if (options.onSuccess) {
                                    options.onSuccess(payload);
                                }
                            }
                        }
                    } else {
                        if (options.onFailure) {
                            options.onFailure(payload, verifyError);
                        }
                    }
                });
            });
        });
    }

    /**
     * Verify a card stored in the vault
     *
     * @param {Object} options
     */
    verify3dSecureVault(options) {
        const checkedRadio = document.querySelector('#creditcard-saved-accounts input:checked[type=radio]');
        const paymentNonce = checkedRadio ? checkedRadio.getAttribute('data-threedsecure-nonce') : null;

        if (paymentNonce) {
            this.verify3dSecureNonce(paymentNonce, {
                onSuccess: (response) => {
                    const nonceField = document.getElementById('creditcard-payment-nonce');
                    if (nonceField) {
                        nonceField.removeAttribute('disabled');
                        nonceField.value = response.nonce;
                        nonceField.setAttribute('value', response.nonce);
                    }

                    if (typeof options.onSuccess === 'function') {
                        options.onSuccess();
                    }
                },
                onFailure: (response, error) => {
                    alert(error);

                    if (typeof options.onFailure === 'function') {
                        options.onFailure();
                    } else {
                        checkout.setLoadWaiting(false);
                    }
                }
            });
        } else {
            alert('No payment nonce present.');

            if (typeof options.onFailure === 'function') {
                options.onFailure();
            } else {
                checkout.setLoadWaiting(false);
            }
        }
    }

    /**
     * Process a standard card request
     *
     * @param {Object} options
     */
    processCard(options) {
        const postcode = this.getBillingPostcode();
        let opt = {};

        if (postcode) {
            opt = {
                billingAddress: {
                    postalCode: postcode
                }
            };
        }

        this._hostedIntegration.tokenize(opt, (tokenizeErr, payload) => {
            if (tokenizeErr) {
                if (typeof options.onFailure === 'function') {
                    options.onFailure();
                } else {
                    checkout.setLoadWaiting(false);
                }

                if (typeof tokenizeErr.message === 'string') {
                    alert(tokenizeErr.message);
                }
                return;
            }

            return this.hostedFieldsNonceReceived(payload, options);
        });
    }

    /**
     * Should integrations intercept credit card payments?
     *
     * @returns {boolean}
     */
    shouldInterceptCreditCard() {
        return (this.amount !== '0.00');
    }

    /**
     * Should integrations intercept PayPal payments?
     *
     * @returns {boolean}
     */
    shouldInterceptPayPal() {
        return true;
    }

    /**
     * Wrapper function which defines which method should be called
     *
     * @param {Object} options
     */
    process(options) {
        options = options || {};

        if (this._hostedFieldsTokenGenerated || (this.usingSavedCard() && !this.usingSavedThreeDCard())) {
            if (typeof options.onSuccess === 'function') {
                options.onSuccess();
            }
        } else if (this.usingSavedThreeDCard()) {
            return this.verify3dSecureVault(options);
        } else {
            return this.processCard(options);
        }
    }

    /**
     * Called on Credit Card loading
     *
     * @returns {boolean}
     */
    creditCardLoaded() {
        return false;
    }

    /**
     * Called on PayPal loading
     *
     * @returns {boolean}
     */
    paypalLoaded() {
        return false;
    }

    /**
     * Add methods to the class prototype (Prototype.js compatibility)
     *
     * @param {Object} methods
     */
    static addMethods(methods) {
        Object.assign(vZero.prototype, methods);
    }
}

// Static property for tracking ajax observation
vZero.observingAjaxRequests = false;
