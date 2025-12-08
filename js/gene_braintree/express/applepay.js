/**
 * Braintree Apple Pay Express class
 *
 * @class BraintreeApplePayExpress
 * @extends BraintreeExpressAbstract
 */
class BraintreeApplePayExpress extends BraintreeExpressAbstract {
    vzeroApplePay = false;

    /**
     * Init the Apple Pay button class
     *
     * @protected
     */
    _init() {
        if (!window.ApplePaySession || (window.ApplePaySession && !ApplePaySession.canMakePayments())) {
            return false;
        }

        this.vzeroApplePay = new vZeroApplePay(
            false,
            this.storeFrontName,
            false,
            false,
            this.urls.clientTokenUrl
        );

        this.selectedMethod = false;
        this.amount = false;
        this.items = [];

        this.initOverlay();
    }

    /**
     * Init our overlay for Apple Pay loading states
     */
    initOverlay() {
        if (document.querySelectorAll('.apple-pay-loading-overlay').length === 0) {
            document.body.insertAdjacentHTML('beforeend',
                '<div class="apple-pay-loading-overlay">' +
                    '<div class="ball-scale-ripple-multiple">' +
                        '<div></div>' +
                        '<div></div>' +
                        '<div></div>' +
                    '</div>' +
                '</div>'
            );
        }
    }

    /**
     * Show the Apple Pay loading state
     */
    setLoading() {
        const overlay = document.querySelector('.apple-pay-loading-overlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    /**
     * Reset the Apple Pay loading state
     */
    resetLoading() {
        const overlay = document.querySelector('.apple-pay-loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Set the vZero Apple Pay amount
     *
     * @param {number|string} amount
     */
    setAmount(amount) {
        this.amount = amount;
        this.vzeroApplePay.amount = amount;
    }

    /**
     * Attach the express instance to a number of buttons
     *
     * @param {NodeList|Array} buttons
     */
    attachToButtons(buttons) {
        // If Apple Pay is not supported, hide the buttons
        if (!window.ApplePaySession || (window.ApplePaySession && !ApplePaySession.canMakePayments())) {
            buttons = Array.from(buttons);
            buttons.forEach((button) => {
                button.style.display = 'none';
            });

            return false;
        }

        const options = {
            validate: this.validateForm,
            onSuccess: (payload, event) => {
                if (this.selectedMethod === false && (typeof this.config.virtual === 'undefined' || !this.config.virtual)) {
                    alert('We\'re unable to ship to the address you\'ve selected. You have not been charged.');
                    return false;
                }

                return this.submitApplePay(
                    payload.nonce,
                    event.payment.shippingContact,
                    event.payment.billingContact,
                    this.selectedMethod
                );
            },
            paymentRequest: {
                requiredShippingContactFields: ['postalAddress', 'email', 'phone'],
                requiredBillingContactFields: ['postalAddress']
            },
            onShippingContactSelect: this.onShippingContactSelect.bind(this),
            onShippingMethodSelect: this.onShippingMethodSelect.bind(this)
        };

        // We don't require shipping details for virtual orders
        if (typeof this.config.virtual !== 'undefined' && this.config.virtual) {
            options.paymentRequest.requiredShippingContactFields = ['email'];
        }

        // Add a class to the parents of the buttons
        buttons = Array.from(buttons);
        buttons.forEach((button) => {
            if (button.parentElement) {
                button.parentElement.classList.add('braintree-applepay-express-container');
            }
        });

        // Initialize the PayPal button logic on any valid buttons on the page
        this.vzeroApplePay.attachApplePayEvent(buttons, options);
    }

    /**
     * Submit an Apple Pay transaction to the server
     *
     * @param {string} nonce
     * @param {Object} shippingAddress
     * @param {Object} billingAddress
     * @param {string} shippingMethod
     */
    async submitApplePay(nonce, shippingAddress, billingAddress, shippingMethod) {
        const params = {
            nonce: nonce,
            shippingAddress: JSON.stringify(shippingAddress),
            billingAddress: JSON.stringify(billingAddress),
            shippingMethod: shippingMethod
        };

        // Pass over the product ID to the submit action
        if (typeof this.config.productId !== 'undefined') {
            params.productId = this.config.productId;
            const productForm = document.getElementById('product_addtocart_form');
            const ppExpressForm = document.getElementById('pp_express_form');
            params.productForm = productForm ? new URLSearchParams(new FormData(productForm)).toString() : (ppExpressForm ? new URLSearchParams(new FormData(ppExpressForm)).toString() : '');
        }

        this.setLoading();

        try {
            const body = new URLSearchParams(params);
            const response = await mahoFetch(this.urls.submitUrl, {
                method: 'POST',
                body: body,
                loaderArea: false
            });

            if (response.success === true) {
                window.location = this.urls.successUrl;
            } else if (response.message) {
                this.resetLoading();
                alert(response.message);
            } else {
                this.resetLoading();
                alert('An unknown issue has occurred whilst processing your Apple Pay payment.');
            }
        } catch (error) {
            this.resetLoading();
            alert('An unknown issue has occurred whilst processing your Apple Pay payment.');
        }
    }

    /**
     * Handle a shipping contact being selected with express flow
     *
     * @param {Object} event
     * @param {Object} applePayInstance
     * @param {ApplePaySession} session
     */
    async onShippingContactSelect(event, applePayInstance, session) {
        const address = event.shippingContact;
        const params = { ...address };

        // Pass over the product ID if not already present
        if (typeof this.config.productId !== 'undefined') {
            params.productId = this.config.productId;
            const productForm = document.getElementById('product_addtocart_form');
            const ppExpressForm = document.getElementById('pp_express_form');
            params.productForm = productForm ? new URLSearchParams(new FormData(productForm)).toString() : (ppExpressForm ? new URLSearchParams(new FormData(ppExpressForm)).toString() : '');
        }

        try {
            const body = new URLSearchParams(params);
            const response = await mahoFetch(this.urls.fetchMethodsUrl, {
                method: 'POST',
                body: body,
                loaderArea: false
            });

            if (response.success === true) {
                const rates = [];
                const newItems = [];
                let firstRate = false;

                // Update the total from the request
                if (response.total) {
                    this.setAmount(parseFloat(response.total).toFixed(2));
                }

                // Add extra items to the view
                this.items = [];
                if (response.items) {
                    response.items.forEach((item) => {
                        if (item.label && item.amount) {
                            this.items.push(item);
                            newItems.push({
                                type: 'final',
                                label: item.label,
                                amount: parseFloat(item.amount).toFixed(2)
                            });
                        }
                    });
                }

                // If there are available rates, update the session
                if (response.rates.length > 0) {
                    // Sort the rates by price (amount)
                    response.rates.sort((a, b) => {
                        return (a.amount > b.amount) ? 1 : ((b.amount > a.amount) ? -1 : 0);
                    });
                    response.rates.forEach((rate) => {
                        rate.amount = parseFloat(rate.amount).toFixed(2);
                        rates.push(rate);
                    });
                    firstRate = rates[0];
                    this.selectedMethod = firstRate.identifier;
                    newItems.push({
                        type: 'final',
                        label: 'Shipping',
                        amount: parseFloat(firstRate.amount).toFixed(2)
                    });
                }

                // Build up the new total
                const newTotal = {
                    label: this.storeFrontName,
                    amount: parseFloat(parseFloat(this.amount) + (firstRate ? parseFloat(firstRate.amount) : 0)).toFixed(2)
                };

                // Display error if invalid postal address
                if (rates.length > 0) {
                    session.completeShippingContactSelection(ApplePaySession.STATUS_SUCCESS, rates, newTotal, newItems);
                } else {
                    session.completeShippingContactSelection(ApplePaySession.STATUS_INVALID_SHIPPING_POSTAL_ADDRESS, rates, newTotal, newItems);
                }
            }
        } catch (error) {
            session.abort();
            alert(Translator.translate('An error was encountered whilst trying to determine shipping rates for your order.'));
        }
    }

    /**
     * Update line items and total cost with shipping methods
     *
     * @param {Object} event
     * @param {Object} applePayInstance
     * @param {ApplePaySession} session
     */
    onShippingMethodSelect(event, applePayInstance, session) {
        const shippingMethod = event.shippingMethod;
        this.selectedMethod = shippingMethod.identifier;

        const newTotal = {
            label: this.storeFrontName,
            amount: parseFloat(parseFloat(this.amount) + parseFloat(shippingMethod.amount)).toFixed(2)
        };
        const newItems = [];

        if (this.items) {
            this.items.forEach((item) => {
                if (item.label && item.amount) {
                    newItems.push({
                        type: 'final',
                        label: item.label,
                        amount: item.amount
                    });
                }
            });
        }

        newItems.push({
            type: 'final',
            label: 'Shipping',
            amount: shippingMethod.amount
        });

        session.completeShippingMethodSelection(ApplePaySession.STATUS_SUCCESS, newTotal, newItems);
    }
}
