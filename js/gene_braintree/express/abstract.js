/**
 * Maho Braintree class to bridge the v.zero JS SDK and Maho
 *
 * @class BraintreeExpressAbstract
 */
class BraintreeExpressAbstract {
    /**
     * Initialize the Braintree Express abstract class
     *
     * @param {string|boolean} clientToken Client token generated from server
     * @param {string} storeFrontName The store name to show within the PayPal modal window
     * @param {string} formKey
     * @param {string} source
     * @param {Object} urls
     * @param {Object} config
     */
    constructor(clientToken, storeFrontName, formKey, source, urls, config) {
        this.clientToken = clientToken || false;
        this.storeFrontName = storeFrontName;
        this.formKey = formKey;
        this.source = source;
        this.urls = urls;
        this.config = config || {};

        this._init();
        this.insertDom();
    }

    /**
     * Private init function
     *
     * @returns {boolean}
     * @protected
     */
    _init() {
        return false;
    }

    /**
     * Insert our elements into the DOM
     */
    insertDom() {
        if (!this.getModal()) {
            document.body.insertAdjacentHTML('beforeend',
                '<div id="pp-express-overlay"></div>' +
                '<div id="pp-express-modal"></div>' +
                '<div id="pp-express-container"></div>'
            );
        }
    }

    /**
     * Get modal's overlay element
     *
     * @returns {Element|null}
     */
    getOverlay() {
        return document.getElementById('pp-express-overlay');
    }

    /**
     * Get the modal element
     *
     * @returns {Element|null}
     */
    getModal() {
        return document.getElementById('pp-express-modal');
    }

    /**
     * Hide the modal
     */
    hideModal() {
        const overlay = this.getOverlay();
        const modal = this.getModal();

        if (overlay) {
            overlay.style.display = 'none';
        }
        if (modal) {
            modal.style.display = 'none';
            modal.innerHTML = '';
        }
    }

    /**
     * Show the modal
     */
    showModal() {
        const overlay = this.getOverlay();
        const modal = this.getModal();

        if (modal) {
            modal.innerHTML = '';
            modal.classList.add('loading');
        }
        if (overlay) {
            overlay.style.display = 'block';
        }
        if (modal) {
            modal.style.display = 'block';
        }
    }

    /**
     * Init the modal
     *
     * @param {Object} params
     */
    async initModal(params) {
        if (typeof params.form_key === 'undefined') {
            params.form_key = this.formKey;
        }
        if (typeof params.source === 'undefined') {
            params.source = this.source;
        }
        this.showModal();

        try {
            const body = new URLSearchParams(params);
            const response = await mahoFetch(this.urls.authUrl, {
                method: 'POST',
                body: body,
                loaderArea: false,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const modal = this.getModal();
            if (modal) {
                modal.classList.remove('loading');
                // mahoFetch returns parsed JSON, but we need HTML here
                // So we need to handle this differently
            }
            this.prepareCoupon();
            this.ajaxHandler();
        } catch (error) {
            this.hideModal();
            alert(typeof Translator === "object" ? Translator.translate("We were unable to complete the request. Please try again.") : "We were unable to complete the request. Please try again.");
        }
    }

    /**
     * Update the grand total display within the modal
     *
     * @param {string} method
     */
    async updateShipping(method) {
        const submitBtn = document.getElementById('paypal-express-submit');
        this._setLoading(submitBtn);

        try {
            const body = new URLSearchParams({
                'submit_shipping': 'true',
                'shipping_method': method
            });
            const response = await mahoFetch(this.urls.shippingSaveUrl, {
                method: 'POST',
                body: body,
                loaderArea: false
            });

            this._unsetLoading(submitBtn);
            this._updateTotals(response);
        } catch (error) {
            this._unsetLoading(submitBtn);
            this.hideModal();
            alert(typeof Translator === "object" ? Translator.translate("We were unable to complete the request. Please try again.") : "We were unable to complete the request. Please try again.");
        }
    }

    /**
     * Prepare the coupon form by handling users hitting enter
     */
    prepareCoupon() {
        const couponField = document.getElementById('paypal-express-coupon');
        if (couponField) {
            couponField.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' || event.keyCode === 13) {
                    event.preventDefault();
                    this.updateCoupon();
                }
            });
        }
    }

    /**
     * Allow customers to add coupons into their basket
     *
     * @param {string} coupon
     * @returns {boolean}
     */
    async updateCoupon(coupon) {
        const couponError = document.getElementById('paypal-express-coupon-error');
        const couponField = document.getElementById('paypal-express-coupon');

        if (couponError) {
            couponError.style.display = 'none';
        }
        if (!coupon && couponField) {
            coupon = couponField.value;
        }

        if (coupon === '') {
            return false;
        }

        const applyBtn = document.getElementById('paypal-express-coupon-apply');
        this._setLoading(applyBtn);

        try {
            const body = new URLSearchParams({ 'coupon': coupon });
            const response = await mahoFetch(this.urls.couponSaveUrl, {
                method: 'POST',
                body: body,
                loaderArea: false
            });

            this._unsetLoading(applyBtn);
            this._updateTotals(response);

            const removeBtn = document.getElementById('paypal-express-coupon-remove');
            if (response.success === true) {
                if (removeBtn) removeBtn.style.display = '';
                if (applyBtn) applyBtn.style.display = 'none';
            } else if (response.message) {
                if (couponError) {
                    couponError.textContent = response.message;
                    couponError.style.display = '';
                }
            }
        } catch (error) {
            this._unsetLoading(applyBtn);
            this.hideModal();
            alert(typeof Translator === "object" ? Translator.translate("We were unable to complete the request. Please try again.") : "We were unable to complete the request. Please try again.");
        }

        return false;
    }

    /**
     * Allow the user the ability to remove the coupon code from their quote
     */
    async removeCoupon() {
        const couponError = document.getElementById('paypal-express-coupon-error');
        if (couponError) {
            couponError.style.display = 'none';
        }

        const removeBtn = document.getElementById('paypal-express-coupon-remove');
        this._setLoading(removeBtn);

        try {
            const body = new URLSearchParams({ 'remove': 'true' });
            const response = await mahoFetch(this.urls.couponSaveUrl, {
                method: 'POST',
                body: body,
                loaderArea: false
            });

            this._unsetLoading(removeBtn);
            this._updateTotals(response);

            const applyBtn = document.getElementById('paypal-express-coupon-apply');
            const couponField = document.getElementById('paypal-express-coupon');

            if (response.success === true) {
                if (removeBtn) removeBtn.style.display = 'none';
                if (applyBtn) applyBtn.style.display = '';
                if (couponField) {
                    couponField.value = '';
                    couponField.focus();
                }
            } else if (response.message) {
                if (couponError) {
                    couponError.textContent = response.message;
                    couponError.style.display = '';
                }
            }
        } catch (error) {
            this._unsetLoading(removeBtn);
            this.hideModal();
            alert(typeof Translator === "object" ? Translator.translate("We were unable to complete the request. Please try again.") : "We were unable to complete the request. Please try again.");
        }
    }

    /**
     * Update the totals from the response
     *
     * @param {Object} response
     * @private
     */
    _updateTotals(response) {
        if (typeof response.totals !== 'undefined') {
            const totalsElement = document.getElementById('paypal-express-totals');
            if (totalsElement) {
                totalsElement.innerHTML = response.totals;
            }
        }
    }

    /**
     * Set an element to a loading state
     *
     * @param {Element} element
     * @private
     */
    _setLoading(element) {
        if (!element) {
            return false;
        }
        element.setAttribute('disabled', 'disabled');
        element.classList.add('loading');
    }

    /**
     * Unset the loading state
     *
     * @param {Element} element
     * @private
     */
    _unsetLoading(element) {
        if (!element) {
            return false;
        }
        element.removeAttribute('disabled');
        element.classList.remove('loading');
    }

    /**
     * Ajax handler
     */
    ajaxHandler() {
        const form = document.getElementById('gene_braintree_paypal_express_pp');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const modal = this.getModal();

            if (modal) {
                modal.classList.add('loading');
                modal.innerHTML = '';
            }

            try {
                const response = await fetch(e.target.getAttribute('action'), {
                    method: 'POST',
                    body: formData
                });
                const text = await response.text();

                if (text === 'complete') {
                    document.location = this.urls.successUrl;
                    return;
                }

                if (modal) {
                    modal.classList.remove('loading');
                    modal.innerHTML = text;
                }
                this.ajaxHandler();
            } catch (error) {
                this.hideModal();
                alert(typeof Translator === "object" ? Translator.translate("We were unable to complete the request. Please try again.") : "We were unable to complete the request. Please try again.");
            }

            return false;
        });
    }

    /**
     * Validate any present forms on the page
     *
     * @returns {boolean}
     */
    validateForm() {
        if (typeof productAddToCartForm === 'object' && productAddToCartForm.validator.validate()) {
            if (typeof productAddToCartFormOld === 'object' && productAddToCartFormOld.validator.validate()) {
                return true;
            } else if (typeof productAddToCartFormOld !== 'object') {
                return true;
            }
        }

        if (typeof productAddToCartForm !== 'object' && typeof productAddToCartFormOld !== 'object') {
            return true;
        }

        return false;
    }

    /**
     * Attach the express instance to a number of buttons
     *
     * @param {NodeList|Array} buttons
     */
    attachToButtons(buttons) {
        console.warn('This method cannot be called directly.');
    }
}
