/**
 * Google Pay vZero integration
 *
 * @class vZeroGooglePay
 */
class vZeroGooglePay {
    /**
     * Initialize
     *
     * @param {string|boolean} clientToken
     * @param {string} storeName
     * @param {vZeroIntegration} integration
     * @param {string} clientTokenUrl
     * @param {Object} additionalOptions
     */
    constructor(clientToken, storeName, integration, clientTokenUrl, additionalOptions) {
        this.clientToken = clientToken || false;
        this.storeName = storeName;
        this.integration = integration || false;
        this.clientTokenUrl = clientTokenUrl;
        this.additionalOptions = additionalOptions;

        this.vzero = this.integration.vzero || false;
        this.methodCode = 'gene_braintree_googlepay';
        this.client = false;
        this.paymentsClient = null;

        if (this.integration) {
            this.bindEvents();
        }

        const body = document.body;
        if (body) {
            body.classList.add('supports-google-pay');
        }
    }

    /**
     * Bind events
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
     * On init default method
     *
     * @param {Object} event
     * @param {vZeroGooglePay} self
     */
    onInitDefaultMethod(event, self) {
        return self._updateButton();
    }

    /**
     * On after update data
     *
     * @param {Object} response
     * @param {vZeroGooglePay} self
     */
    onAfterUpdateData(response, self) {
        if (typeof response.grandTotal !== 'undefined' && response.grandTotal) {
            self.amount = response.grandTotal;
        }

        return self._updateButton();
    }

    /**
     * On payment method switch
     *
     * @param {Object} event
     * @param {vZeroGooglePay} self
     */
    onPaymentMethodSwitch(event, self) {
        return self._updateButton();
    }

    /**
     * On observe ajax requests
     *
     * @param {Object} event
     * @param {vZeroGooglePay} self
     */
    onObserveAjaxRequests(event, self) {
        return self._updateButton();
    }

    /**
     * On review init
     *
     * @param {Object} event
     * @param {vZeroGooglePay} self
     */
    onReviewInit(event, self) {
        return self._updateButton();
    }

    /**
     * Is Google Pay active?
     *
     * @returns {boolean}
     */
    isGooglePayActive() {
        return (!this.integration || this.integration.getPaymentMethod() === this.methodCode);
    }

    /**
     * Update button
     *
     * @private
     */
    _updateButton() {
        if (this.isGooglePayActive()) {
            this.addButton();
        } else {
            this.hideButton();
        }
    }

    /**
     * Add button
     */
    addButton() {
        if (this.isGooglePayActive()) {
            this.attachGooglePayEvent();
        }
    }

    /**
     * Hide button
     */
    hideButton() {
        if (this.button) {
            this.button.style.display = 'none';
        }
    }

    /**
     * Attach Google Pay event
     */
    attachGooglePayEvent() {
        const merchantAccountId = this.additionalOptions.merchantAccountId;
        const currencyCode = this.additionalOptions.currencyCode;
        const allowedCardNetworks = this.additionalOptions.allowedCardNetworks;

        this.getClient((clientInstance) => {
            braintree.googlePayment.create({
                client: clientInstance,
                googlePayVersion: 2,
                googleMerchantId: merchantAccountId
            }, (googlePaymentErr, googlePaymentInstance) => {
                if (googlePaymentErr) {
                    console.error('Error creating google pay instance:', googlePaymentErr);
                    return;
                }

                const paymentsClient = this.getGooglePaymentsClient();

                paymentsClient.isReadyToPay({
                    apiVersion: 2,
                    apiVersionMinor: 0,
                    allowedPaymentMethods: googlePaymentInstance.createPaymentDataRequest().allowedPaymentMethods
                }).then((response) => {
                    if (response.result) {
                        const button = paymentsClient.createButton({
                            onClick: () => {
                                const paymentDataRequest = googlePaymentInstance.createPaymentDataRequest({
                                    transactionInfo: {
                                        currencyCode: currencyCode,
                                        totalPriceStatus: 'ESTIMATED',
                                        totalPrice: this.vzero.amount
                                    },
                                    allowedPaymentMethods: [{
                                        type: "CARD",
                                        parameters: {
                                            allowedCardNetworks: allowedCardNetworks,
                                            billingAddressRequired: true,
                                            billingAddressParameters: {
                                                format: 'MIN',
                                                phoneNumberRequired: true
                                            }
                                        }
                                    }],
                                    emailRequired: true,
                                    shippingAddressRequired: true,
                                });

                                paymentsClient.loadPaymentData(paymentDataRequest).then((paymentData) => {
                                    return googlePaymentInstance.parseResponse(paymentData);
                                }).then((result) => {
                                    const nonceField = document.getElementById('googlepay-payment-nonce');
                                    if (nonceField) {
                                        nonceField.value = result.nonce;
                                    }
                                    this.vzero.integration.submitCheckout();
                                }).catch((err) => {
                                    console.error(err);
                                });
                            }
                        });

                        if (button) {
                            const checkoutBtn = document.querySelector('#review-buttons-container .btn-checkout');
                            if (checkoutBtn) {
                                checkoutBtn.style.display = 'none';
                            }

                            const container = document.getElementById('review-buttons-container');
                            if (container) {
                                container.appendChild(button);
                            }
                        }
                    }
                }).catch((err) => {
                    console.error(err);
                });
            });
        });
    }

    /**
     * Get Google Payments Client
     *
     * @returns {Object}
     */
    getGooglePaymentsClient() {
        const environment = this.additionalOptions.environment;

        if (this.paymentsClient === null) {
            this.paymentsClient = new google.payments.api.PaymentsClient({
                environment: environment === 'sandbox' ? 'TEST' : 'PRODUCTION'
            });
        }

        return this.paymentsClient;
    }

    /**
     * Get client
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
     * Get client token
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
}
