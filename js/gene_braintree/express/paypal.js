/**
 * Braintree PayPal Express class
 *
 * @class BraintreePayPalExpress
 * @extends BraintreeExpressAbstract
 */
class BraintreePayPalExpress extends BraintreeExpressAbstract {
    vzeroPayPal = false;

    /**
     * Init the PayPal button class
     *
     * @protected
     */
    _init() {
        this.vzeroPayPal = new vZeroPayPalButton(
            false,
            '',
            false, /* Vault flow forced as the final amount can change */
            this.config.locale,
            false,
            false,
            this.urls.clientTokenUrl,
            {}
        );
    }

    /**
     * Attach the PayPal instance to the buttons
     *
     * @param {NodeList|Array} buttons
     */
    attachToButtons(buttons) {
        const options = {
            env: this.config.env,
            commit: false,
            style: this.config.buttonStyle,
            funding: this.config.funding,
            payment: {
                flow: 'checkout',
                amount: this.config.total,
                currency: this.config.currency,
                enableShippingAddress: true,
                shippingAddressEditable: true,
                displayName: this.config.displayName
            },
            events: {
                validate: this.validateForm,
                onAuthorize: (payload) => {
                    const params = {
                        paypal: JSON.stringify(payload)
                    };
                    if (typeof this.config.productId !== 'undefined') {
                        params.product_id = this.config.productId;
                        const productForm = document.getElementById('product_addtocart_form');
                        const ppExpressForm = document.getElementById('pp_express_form');
                        params.form_data = productForm ? new URLSearchParams(new FormData(productForm)).toString() : (ppExpressForm ? new URLSearchParams(new FormData(ppExpressForm)).toString() : '');
                    }
                    this.initModal(params);
                },
                onCancel: () => {
                    this.hideModal();
                },
                onError: () => {
                    alert(typeof Translator === "object" ? Translator.translate("We were unable to complete the request. Please try again.") : "We were unable to complete the request. Please try again.");
                }
            }
        };

        // Add a class to the parents of the buttons
        buttons = Array.from(buttons);
        buttons.forEach((button) => {
            if (button.parentElement) {
                button.parentElement.classList.add('braintree-paypal-express-container');
            }
        });

        // Initialize the PayPal button logic on any valid buttons on the page
        this.vzeroPayPal.attachPayPalButtonEvent(buttons, options);
    }
}
