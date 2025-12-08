/**
 * Separate class to handle functionality around the vZero PayPal button
 *
 * @class vZeroPayPalButton
 */
class vZeroPayPalButton {
    /**
     * Initialize the PayPal button class
     *
     * @param {string|boolean} clientToken Client token generated from server
     * @param {string} storeFrontName The store name to show within the PayPal modal window
     * @param {boolean} singleUse Should the system attempt to open in single payment mode?
     * @param {string} locale The locale for the payment
     * @param {boolean} futureSingleUse When using future payments should we process the transaction as a single payment?
     * @param {boolean} onlyVaultOnVault Should we only show the Vault flow if the customer has opted into saving their details?
     * @param {string} clientTokenUrl URL to retrieve client token from
     * @param {Object} additionalOptions Additional arguments for paypal button
     */
    constructor(clientToken, storeFrontName, singleUse, locale, futureSingleUse, onlyVaultOnVault, clientTokenUrl, additionalOptions) {
        this.clientToken = clientToken || false;
        this.clientTokenUrl = clientTokenUrl;
        this.storeFrontName = storeFrontName;
        this.singleUse = singleUse;
        this.locale = locale;
        this.additionalOptions = additionalOptions;

        this.amount = 0.00;
        this.currency = false;
        this.client = false;
        this.onlyVaultOnVault = onlyVaultOnVault || false;
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
     * Update the pricing information for the PayPal button
     *
     * @param {number|string} amount The amount formatted to two decimal places
     * @param {string} currency The currency code
     */
    setPricing(amount, currency) {
        this.amount = parseFloat(amount);
        this.currency = currency;
    }

    /**
     * Rebuild the button
     *
     * @deprecated due to JavaScript v3
     * @returns {boolean}
     */
    rebuildButton() {
        return false;
    }

    /**
     * Inject the PayPal button into the document
     *
     * @param {Object} options Object containing onSuccess method
     * @param {string|Element} containerQuery
     */
    addPayPalButton(options, containerQuery) {
        containerQuery = containerQuery || '#paypal-container';

        let container;
        if (typeof containerQuery === 'string') {
            container = document.querySelectorAll(containerQuery);
        } else {
            container = containerQuery;
        }

        if (!container || container.length === 0) {
            console.error('Unable to locate container ' + containerQuery + ' for PayPal button.');
            return false;
        }

        this.attachPayPalButtonEvent(container, options);
    }

    /**
     * Attach the PayPal button event
     *
     * @param {NodeList|Array} buttons
     * @param {Object} options
     */
    attachPayPalButtonEvent(buttons, options) {
        this.getClient((clientInstance) => {
            braintree.paypalCheckout.create({
                client: clientInstance
            }, (paypalCheckoutErr, paypalCheckoutInstance) => {
                if (paypalCheckoutErr) {
                    console.error('Error creating PayPal Checkout:', paypalCheckoutErr);
                    return;
                }

                buttons = Array.from(buttons);
                buttons.forEach((button) => {
                    const id = 'paypal_button_' + this.getRandomQS();
                    button.id = id;
                    button.classList.add('paypalbtn-rendered');

                    const params = {
                        env: options.env,
                        commit: options.commit,
                        style: options.style,
                        funding: { allowed: [], disallowed: [] },

                        payment: () => {
                            if (typeof options.events.validate === 'function' && options.events.validate() === false) {
                                return Promise.reject(new Error('Please select the required product options.'));
                            }

                            return paypalCheckoutInstance.createPayment(options.payment);
                        },
                        onAuthorize: (data, actions) => {
                            return paypalCheckoutInstance.tokenizePayment(data)
                                .then(options.events.onAuthorize);
                        },
                        onCancel: () => {
                            if (typeof options.events.onCancel === 'function') {
                                options.events.onCancel();
                            }
                        },
                        onError: (err) => {
                            if (typeof options.events.onError === 'function') {
                                options.events.onError();
                            }
                        }
                    };

                    // Build up funding object
                    if (options.funding.allowed.indexOf('credit') >= 0) {
                        params.funding.allowed.push(paypal.FUNDING.CREDIT);
                    } else if (options.funding.disallowed.indexOf('credit') >= 0) {
                        params.funding.disallowed.push(paypal.FUNDING.CREDIT);
                    }
                    if (options.funding.allowed.indexOf('card') >= 0) {
                        params.funding.allowed.push(paypal.FUNDING.CARD);
                    } else if (options.funding.disallowed.indexOf('card') >= 0) {
                        params.funding.disallowed.push(paypal.FUNDING.CARD);
                    }
                    if (options.funding.allowed.indexOf('elv') >= 0) {
                        params.funding.allowed.push(paypal.FUNDING.ELV);
                    } else if (options.funding.disallowed.indexOf('elv') >= 0) {
                        params.funding.disallowed.push(paypal.FUNDING.ELV);
                    }

                    // Override style options if present on the button element
                    if (button.getAttribute('data-style-layout')) {
                        params.style.layout = button.getAttribute('data-style-layout');
                    }
                    if (button.getAttribute('data-style-size')) {
                        params.style.size = button.getAttribute('data-style-size');
                    }
                    if (button.getAttribute('data-style-shape')) {
                        params.style.shape = button.getAttribute('data-style-shape');
                    }
                    if (button.getAttribute('data-style-color')) {
                        params.style.color = button.getAttribute('data-style-color');
                    }

                    this.renderPayPalBtn(Object.assign({}, params), '#' + id);
                });
            });
        });
    }

    /**
     * Render the PayPal button
     *
     * @param {Object} params
     * @param {string} elId
     */
    renderPayPalBtn(params, elId) {
        paypal.Button.render(params, elId);
    }

    /**
     * Build the options for our tokenization
     *
     * @returns {Object}
     * @private
     */
    _buildOptions() {
        const funding = this.additionalOptions.funding;
        return {
            env: this.additionalOptions.env,
            commit: true,
            style: this.additionalOptions.buttonStyle,
            payment: {
                flow: this._getFlow(),
                amount: this.amount,
                currency: this.currency,
                enableShippingAddress: false,
                shippingAddressEditable: false,
                displayName: this.storeFrontName
            },
            funding: funding
        };
    }

    /**
     * Determine the flow for the PayPal window
     *
     * @returns {string}
     * @private
     */
    _getFlow() {
        let flow;

        if (this.singleUse === true) {
            flow = 'checkout';
        } else {
            flow = 'vault';
        }

        const storeInVault = document.getElementById('gene_braintree_paypal_store_in_vault');
        if (storeInVault !== null) {
            if (this.onlyVaultOnVault &&
                flow === 'vault' &&
                !storeInVault.checked
            ) {
                flow = 'checkout';
            }
        }

        return flow;
    }

    /**
     * Generates a random number for PayPal button QuerySelector
     *
     * @returns {number}
     */
    getRandomQS() {
        const num = Math.random() * (999999 - 1) + 1;
        return Math.floor(num);
    }
}
