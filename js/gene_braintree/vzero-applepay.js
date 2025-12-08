/**
 * Separate class to handle functionality around the vZero Apple Pay functionality
 *
 * @class vZeroApplePay
 */
class vZeroApplePay {
    /**
     * Initialize the Apple Pay button class
     *
     * @param {string|boolean} clientToken Client token generated from server
     * @param {string} storeFrontName The store name to show within the PayPal modal window
     * @param {vZeroIntegration} integration
     * @param {string} appleButtonSelector
     * @param {string} clientTokenUrl
     */
    constructor(clientToken, storeFrontName, integration, appleButtonSelector, clientTokenUrl) {
        if (!window.ApplePaySession || (window.ApplePaySession && !ApplePaySession.canMakePayments())) {
            console.warn('This browser does not support Apple Pay, the method will be hidden.');
            return false;
        }

        this.clientToken = clientToken || false;
        this.storeFrontName = storeFrontName;
        this.integration = integration || false;
        this.appleButtonSelector = appleButtonSelector;
        this.clientTokenUrl = clientTokenUrl;

        this.vzero = this.integration.vzero || false;
        this.methodCode = 'gene_braintree_applepay';
        this.client = false;
        this.amount = false;
        this.button = false;

        if (this.integration) {
            this.bindEvents();
        }

        const body = document.body;
        if (body) {
            body.classList.add('supports-apple-pay');
        }
    }

    /**
     * Bind various events to ensure Apple Pay functionality
     */
    bindEvents() {
        this.vzero.observeEvent('integration.onInitDefaultMethod', this.onInitDefaultMethod, this);
        this.vzero.observeEvent('onAfterUpdateData', this.onAfterUpdateData, this);

        if (this.integration.isOnepage) {
            this.vzero.observeEvent('integration.onPaymentMethodSwitch', this.onPaymentMethodSwitch, this);
            this.vzero.observeEvent('integration.onObserveAjaxRequests', this.onObserveAjaxRequests, this);
        } else {
            this.vzero.observeEvent('integration.onReviewInit', this.onReviewInit, this);
        }
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
     * Retrieve the client from the class, or initialize the client if not already present
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
     * Is the Apple Pay payment method selected?
     *
     * @returns {boolean}
     */
    isApplePayActive() {
        return (!this.integration || this.integration.getPaymentMethod() === this.methodCode);
    }

    /**
     * After an update from vZero ensure the amount in this class is updated
     *
     * @param {Object} response
     * @param {vZeroApplePay} self
     */
    onAfterUpdateData(response, self) {
        if (typeof response.grandTotal !== 'undefined' && response.grandTotal) {
            self.amount = response.grandTotal;
        }

        return self._updateButton();
    }

    /**
     * Check to see if Apple Pay is active by default
     *
     * @param {Object} event
     * @param {vZeroApplePay} self
     */
    onInitDefaultMethod(event, self) {
        return self._updateButton();
    }

    /**
     * On payment method switch detect if we should modify the Apple Pay button
     *
     * @param {Object} event
     * @param {vZeroApplePay} self
     */
    onPaymentMethodSwitch(event, self) {
        return self._updateButton();
    }

    /**
     * When an ajax request is observed run some code
     *
     * @param {Object} event
     * @param {vZeroApplePay} self
     * @returns {*}
     */
    onObserveAjaxRequests(event, self) {
        return self._updateButton();
    }

    /**
     * In non one step checkouts we add the button on the review step
     *
     * @param {Object} event
     * @param {vZeroApplePay} self
     */
    onReviewInit(event, self) {
        return self._updateButton();
    }

    /**
     * Update the button dependant on the active state
     *
     * @private
     */
    _updateButton() {
        if (this.isApplePayActive()) {
            this.addButton(false, false, true);
        } else {
            this.hideButton();
        }
    }

    /**
     * Add our button to the page
     *
     * @param {string|boolean} buttonHtml
     * @param {string|Element|boolean} submitButtonQuery
     * @param {boolean} append
     */
    addButton(buttonHtml, submitButtonQuery, append) {
        const appleButtonElement = document.querySelector(this.appleButtonSelector);
        buttonHtml = buttonHtml || (appleButtonElement ? appleButtonElement.innerHTML : '');
        submitButtonQuery = submitButtonQuery || this.integration.submitButtonClass;
        append = append || false;

        if (this.isApplePayActive()) {
            if (!buttonHtml) {
                console.error('Unable to locate Apple Pay button with selector ' + this.appleButtonSelector);
            } else if (!submitButtonQuery) {
                console.error('Unable to locate element with selector ' + this.appleButtonSelector + ' for button insertion');
            } else {
                let submitButton;
                if (typeof submitButtonQuery === 'string') {
                    submitButton = document.querySelector(submitButtonQuery);
                } else {
                    submitButton = submitButtonQuery;
                }

                if (!submitButton) {
                    console.warn('Unable to locate container for Apple Pay button.');
                    return false;
                }

                const submitButtonParent = submitButton.parentElement;

                if (this.button) {
                    this.button.style.display = '';
                    if (append) {
                        submitButton.style.display = 'none';
                    }
                } else {
                    if (append) {
                        submitButtonParent.insertAdjacentHTML('beforeend', buttonHtml);
                        submitButton.style.display = 'none';
                    } else {
                        submitButtonParent.innerHTML = buttonHtml;
                    }

                    const applePayButtons = submitButtonParent.querySelectorAll('[data-applepay]');
                    if (!applePayButtons.length) {
                        console.warn('Unable to find valid <button /> element within container.');
                        return false;
                    }

                    const button = applePayButtons[0];
                    this.button = button;
                    button.classList.add('braintree-applepay-loading');
                    button.setAttribute('disabled', 'disabled');

                    const options = {
                        validate: this.integration.validateAll
                    };
                    this.attachApplePayEvent(button, options);
                }
            }
        }
    }

    /**
     * Attach our apple pay button event
     *
     * @param {Element|Array} buttons
     * @param {Object} options
     */
    attachApplePayEvent(buttons, options) {
        this.getClient((clientInstance) => {
            braintree.applePay.create({
                client: clientInstance
            }, (applePayErr, applePayInstance) => {
                if (applePayErr) {
                    console.error('Error creating applePayInstance:', applePayErr);
                    return;
                }

                const promise = window.ApplePaySession.canMakePaymentsWithActiveCard(applePayInstance.merchantIdentifier);
                promise.then((canMakePaymentsWithActiveCard) => {
                    if (canMakePaymentsWithActiveCard) {
                        this.bindButtons(buttons, options, applePayInstance);
                    }
                });
            });
        });
    }

    /**
     * Bind the button events
     *
     * @param {Element|Array} buttons
     * @param {Object} options
     * @param {Object} applePayInstance
     */
    bindButtons(buttons, options, applePayInstance) {
        options = options || {};

        if (!Array.isArray(buttons)) {
            buttons = [buttons];
        }

        buttons.forEach((button) => {
            button.classList.remove('braintree-applepay-loading');
            button.removeAttribute('disabled');
            button.style.display = '';

            // Clone to remove existing event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (typeof options.validate === 'function') {
                    try {
                        var optionsPassed = options.validate();
                    } catch (err) {
                        if (typeof productAddToCartForm !== 'object' || productAddToCartForm.form === null) {
                            var optionsPassed = true;
                        } else {
                            var optionsPassed = false;
                            throw err;
                        }
                    }
                    if (optionsPassed) {
                        const session = this.createApplePaySession(applePayInstance, options);
                        session.begin();
                    }
                } else {
                    const session = this.createApplePaySession(applePayInstance, options);
                    session.begin();
                }
            });

            // Update reference
            if (this.button === button) {
                this.button = newButton;
            }
        });
    }

    /**
     * Build our payment request
     *
     * @param {Object} applePayInstance
     * @param {Object} options
     * @returns {Object}
     */
    buildPaymentRequest(applePayInstance, options) {
        let paymentRequest = {
            total: {
                label: this.storeFrontName,
                amount: this.amount || this.vzero.amount
            }
        };

        if (typeof options.paymentRequest === 'object') {
            paymentRequest = Object.assign(paymentRequest, options.paymentRequest);
        }

        return applePayInstance.createPaymentRequest(paymentRequest);
    }

    /**
     * Create our Apple Pay session
     *
     * @param {Object} applePayInstance
     * @param {Object} options
     * @returns {ApplePaySession}
     */
    createApplePaySession(applePayInstance, options) {
        const session = new ApplePaySession(1, this.buildPaymentRequest(applePayInstance, options));

        session.onvalidatemerchant = (event) => {
            this.onValidateMerchant(event, applePayInstance, session);
        };
        session.onpaymentauthorized = (event) => {
            this.onPaymentAuthorized(event, applePayInstance, session, options);
        };
        session.onshippingcontactselected = (event) => {
            if (typeof options.onShippingContactSelect === 'function') {
                options.onShippingContactSelect(event, applePayInstance, session);
            }
        };
        session.onshippingmethodselected = (event) => {
            if (typeof options.onShippingMethodSelect === 'function') {
                options.onShippingMethodSelect(event, applePayInstance, session);
            }
        };

        return session;
    }

    /**
     * Handle validation of merchant
     *
     * @param {Object} event
     * @param {Object} applePayInstance
     * @param {ApplePaySession} session
     */
    onValidateMerchant(event, applePayInstance, session) {
        applePayInstance.performValidation({
            validationURL: event.validationURL,
            displayName: this.storeFrontName
        }, (validationErr, merchantSession) => {
            if (validationErr) {
                console.error('Error validating merchant:', validationErr);
                session.abort();
                return;
            }
            session.completeMerchantValidation(merchantSession);
        });
    }

    /**
     * Handle the payment being authorized
     *
     * @param {Object} event
     * @param {Object} applePayInstance
     * @param {ApplePaySession} session
     * @param {Object} options
     */
    onPaymentAuthorized(event, applePayInstance, session, options) {
        applePayInstance.tokenize({
            token: event.payment.token
        }, (tokenizeErr, payload) => {
            if (tokenizeErr) {
                console.error('Error tokenizing Apple Pay:', tokenizeErr);
                session.completePayment(ApplePaySession.STATUS_FAILURE);
                return;
            }
            session.completePayment(ApplePaySession.STATUS_SUCCESS);

            if (this.integration) {
                this.updatePaymentNonce(payload.nonce);
                this.integration.resetLoading();
                this.integration.submitCheckout();
            } else {
                if (typeof options.onSuccess === 'function') {
                    options.onSuccess(payload, event);
                }
            }
        });
    }

    /**
     * Update the payment nonce
     *
     * @param {string} nonce
     */
    updatePaymentNonce(nonce) {
        const nonceField = document.getElementById('applepay-payment-nonce');
        if (nonceField) {
            nonceField.value = nonce;
        }
    }

    /**
     * Hide the button
     */
    hideButton() {
        if (this.button) {
            this.button.style.display = 'none';
        }
    }
}
