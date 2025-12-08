/**
 * The integration class for the Default checkout
 *
 * @class vZeroIntegration
 */
class vZeroIntegration {
    /**
     * Device Data instance from braintree
     */
    dataCollectorInstance = null;

    /**
     * Static loaded flag to prevent multiple initializations
     */
    static loaded = false;

    /**
     * Create an instance of the integration
     *
     * @param {vZero} vzero The vZero class that's being used by the checkout
     * @param {vZeroPayPalButton} vzeroPaypal The vZero PayPal object
     * @param {string} paypalWrapperMarkUp The markup used to wrap the PayPal button
     * @param {string} paypalButtonClass The class of the button we need to replace
     * @param {boolean} isOnepage Is the integration a onepage checkout?
     * @param {Object} config Any further config the integration wants to push into the class
     * @param {boolean} submitAfterPayment Is the checkout going to submit the payment after the payment step?
     */
    constructor(vzero, vzeroPaypal, paypalWrapperMarkUp, paypalButtonClass, isOnepage, config, submitAfterPayment) {
        if (vZeroIntegration.loaded) {
            console.error('Your checkout is including the Braintree resources multiple times, please resolve this.');
            return false;
        }
        vZeroIntegration.loaded = true;

        this.vzero = vzero || false;
        this.vzeroPaypal = vzeroPaypal || false;

        if (this.vzero === false && this.vzeroPaypal === false) {
            console.warn('The vzero and vzeroPaypal objects are not initiated.');
            return false;
        }

        this.paypalWrapperMarkUp = paypalWrapperMarkUp || false;
        this.paypalButtonClass = paypalButtonClass || false;
        this.submitButtonClass = this.paypalButtonClass;

        this.isOnepage = isOnepage || false;
        this.config = config || {};
        this.submitAfterPayment = submitAfterPayment || false;

        this._methodSwitchTimeout = false;
        this._originalSubmitFn = false;

        this.kountEnvironment = false;
        this.kountId = false;

        mahoOnReady(() => {
            if (this.captureOriginalSubmitFn()) {
                this.observeSubmissionOverride();
            }

            this.prepareSubmitObserver();
            this.preparePaymentMethodSwitchObserver();
        });

        this.hostedFieldsGenerated = false;

        if (this.isOnepage) {
            this.observeAjaxRequests();

            mahoOnReady(() => {
                this.initSavedPayPal();
                this.initDefaultMethod();

                if (document.getElementById('braintree-hosted-submit') !== null) {
                    this.initHostedFields();
                }
            });
        }

        mahoOnReady(() => {
            this.initSavedMethods();

            if (document.getElementById('braintree-hosted-submit') !== null) {
                this.initHostedFields();
            }
        });

        this._deviceDataInit = false;
        this.vzero.observeEvent([
            'onHandleAjaxRequest',
            'integration.onInitSavedMethods'
        ], this.initDeviceData, this);

        this.vzero.observeEvent('integration.onBeforeSubmit', () => {
            const deviceData = document.getElementById('braintree-device-data');
            if (deviceData !== null) {
                deviceData.removeAttribute('disabled');
            }
        }, this);

        this.vzero.fireEvent(this, 'integration.onInit', { integration: this });
    }

    /**
     * Add device_data into the session
     *
     * @param {Object} params
     * @param {vZeroIntegration} self
     */
    initDeviceData(params, self) {
        const creditCardForm = document.getElementById('credit-card-form');
        if (creditCardForm !== null) {
            const form = creditCardForm.closest('form');
            if (form) {
                if (form.querySelectorAll('#braintree-device-data').length === 0) {
                    if (self._deviceDataInit === true) {
                        return false;
                    }
                    self._deviceDataInit = true;

                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'payment[device_data]';
                    input.id = 'braintree-device-data';
                    form.appendChild(input);

                    self.populateDeviceData(input);
                }
            }
        }
    }

    /**
     * Populate device data using the data collector
     *
     * @param {HTMLInputElement} input
     */
    populateDeviceData(input) {
        if (this.dataCollectorInstance !== null) {
            this.dataCollectorInstance.teardown(() => {
                this.dataCollectorInstance = null;
                return this.populateDeviceData(input);
            });
            return;
        }

        this.vzero.getClient((clientInstance) => {
            const params = {
                client: clientInstance,
                kount: true
            };

            if (this.vzeroPaypal !== false) {
                params.paypal = true;
            }

            braintree.dataCollector.create(params, (err, dataCollectorInstance) => {
                if (err) {
                    if (err.code !== 'DATA_COLLECTOR_KOUNT_NOT_ENABLED' &&
                        err.code !== 'DATA_COLLECTOR_PAYPAL_NOT_ENABLED'
                    ) {
                        console.error(err);
                    } else {
                        console.warn('A warning occurred whilst initialisation the Braintree data collector. This warning can be safely ignored.');
                        console.warn(err);
                    }
                    return;
                }

                this.dataCollectorInstance = dataCollectorInstance;
                input.value = dataCollectorInstance.deviceData;
                input.removeAttribute('disabled');
                this._deviceDataInit = false;
            });
        });
    }

    /**
     * Init the saved method events
     */
    initSavedMethods() {
        document.querySelectorAll('#creditcard-saved-accounts input[type="radio"], #paypal-saved-accounts input[type="radio"]').forEach((element) => {
            let parentElement = '';
            let targetElement = '';

            if (element.closest('#creditcard-saved-accounts')) {
                parentElement = '#creditcard-saved-accounts';
                targetElement = '#credit-card-form';
            } else if (element.closest('#paypal-saved-accounts')) {
                parentElement = '#paypal-saved-accounts';
                targetElement = '.paypal-info';
            }

            // Remove existing listener and add new one
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            newElement.addEventListener('change', () => {
                return this.showHideOtherMethod(parentElement, targetElement);
            });
        });

        this.vzero.fireEvent(this, 'integration.onInitSavedMethods');
    }

    /**
     * Hide or show the "other" method for both PayPal & Credit Card
     *
     * @param {string} parentElement
     * @param {string} targetElement
     */
    showHideOtherMethod(parentElement, targetElement) {
        const checkedRadio = document.querySelector(parentElement + ' input:checked[type=radio]');
        const target = document.querySelector(targetElement);

        if (checkedRadio && checkedRadio.value === 'other') {
            if (target) {
                target.style.display = '';
                document.querySelectorAll(targetElement + ' input, ' + targetElement + ' select').forEach((formElement) => {
                    formElement.removeAttribute('disabled');
                });
            }
        } else if (checkedRadio) {
            if (target) {
                target.style.display = 'none';
                document.querySelectorAll(targetElement + ' input, ' + targetElement + ' select').forEach((formElement) => {
                    formElement.setAttribute('disabled', 'disabled');
                });
            }
        }

        this.vzero.fireEvent(this, 'integration.onShowHideOtherMethod', {
            parentElement: parentElement,
            targetElement: targetElement
        });
    }

    /**
     * Check to see if the "Other" option is selected and show the div correctly
     */
    checkSavedOther() {
        let parentElement = '';
        let targetElement = '';

        if (this.getPaymentMethod() === 'gene_braintree_creditcard') {
            parentElement = '#creditcard-saved-accounts';
            targetElement = '#credit-card-form';
        } else if (this.getPaymentMethod() === 'gene_braintree_paypal') {
            parentElement = '#paypal-saved-accounts';
            targetElement = '.paypal-info';
        }

        if (document.querySelector(parentElement)) {
            this.showHideOtherMethod(parentElement, targetElement);
        }

        this.vzero.fireEvent(this, 'integration.onCheckSavedOther');
    }

    /**
     * After the payment methods have switched run this
     *
     * @returns {boolean}
     */
    afterPaymentMethodSwitch() {
        return true;
    }

    /**
     * Init hosted fields
     */
    initHostedFields() {
        if (this.vzero.hostedFields) {
            const submitBtn = document.getElementById('braintree-hosted-submit');
            if (submitBtn !== null) {
                const form = submitBtn.closest('form');
                if (form) {
                    this.form = form;
                    this.vzero.initHostedFields(this);
                } else {
                    console.error('Hosted Fields cannot be initialized as we\'re unable to locate the parent form.');
                }
            }
        }
    }

    /**
     * Validate hosted fields is complete and error free
     *
     * @returns {boolean}
     */
    validateHostedFields() {
        if (!this.vzero.usingSavedCard() && this.vzero._hostedIntegration) {
            const state = this.vzero._hostedIntegration.getState();
            const errorMsgs = [];
            const translate = {
                'number': Translator.translate('Card Number'),
                'expirationMonth': Translator.translate('Expiry Month'),
                'expirationYear': Translator.translate('Expiry Year'),
                'cvv': Translator.translate('CVV'),
                'postalCode': Translator.translate('Postal Code')
            };

            Object.entries(state.fields).forEach(([fieldName, fieldState]) => {
                if (fieldState.isValid === false) {
                    errorMsgs.push(translate[fieldName] + ' ' + Translator.translate('is invalid.'));
                }
            });

            if (errorMsgs.length > 0) {
                alert(
                    Translator.translate('There are a number of errors present with the credit card form:') +
                    "\n" +
                    errorMsgs.join("\n")
                );
                return false;
            }

            if (this.vzero.cardType && this.vzero.supportedCards) {
                if (this.vzero.supportedCards.indexOf(this.vzero.cardType) === -1) {
                    alert(Translator.translate(
                        'We\'re currently unable to process this card type, please try another card or payment method.'
                    ));
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Init the default payment methods
     */
    initDefaultMethod() {
        if (this.shouldAddPayPalButton(false)) {
            this.setLoading();
            this.vzero.updateData(() => {
                this.resetLoading();
                this.updatePayPalButton('add');
            });
        }

        this.afterPaymentMethodSwitch();
        this.vzero.fireEvent(this, 'integration.onInitDefaultMethod');
    }

    /**
     * Observe any Ajax requests and refresh the PayPal button or update the checkouts data
     */
    observeAjaxRequests() {
        this.vzero.observeAjaxRequests(() => {
            this.vzero.updateData(() => {
                if (this.isOnepage) {
                    this.initSavedPayPal();
                    this.rebuildPayPalButton();
                    this.checkSavedOther();

                    if (this.vzero.hostedFields) {
                        this.initHostedFields();
                    }
                }

                this.initSavedMethods();
                this.afterPaymentMethodSwitch();
                this.vzero.fireEvent(this, 'integration.onObserveAjaxRequests');
            });
        }, (typeof this.config.ignoreAjax !== 'undefined' ? this.config.ignoreAjax : false));
    }

    /**
     * Rebuild the PayPal button if it's been removed
     */
    rebuildPayPalButton() {
        if (document.getElementById('paypal-container') === null) {
            this.updatePayPalButton();
        }
    }

    /**
     * Handle saved PayPals being present on the page
     */
    initSavedPayPal() {
        const savedAccounts = document.getElementById('paypal-saved-accounts');
        if (savedAccounts && savedAccounts.querySelector('input[type=radio]')) {
            savedAccounts.addEventListener('change', (event) => {
                if (event.target.type === 'radio') {
                    this.updatePayPalButton(false, 'gene_braintree_paypal');
                }
            });
        }
    }

    /**
     * Capture the original submit function
     *
     * @returns {boolean}
     */
    captureOriginalSubmitFn() {
        return false;
    }

    /**
     * Start an interval to ensure the submit function has been correctly overridden
     */
    observeSubmissionOverride() {
        setInterval(() => {
            if (this._originalSubmitFn) {
                this.prepareSubmitObserver();
            }
        }, 500);
    }

    /**
     * Set the submit function to be used
     *
     * @returns {boolean}
     */
    prepareSubmitObserver() {
        return false;
    }

    /**
     * Event to run before submit
     *
     * @param {Function} callback
     * @returns {*}
     */
    beforeSubmit(callback) {
        return this._beforeSubmit(callback);
    }

    /**
     * Private before submit function
     *
     * @param {Function} callback
     * @private
     */
    _beforeSubmit(callback) {
        this.vzero.fireEvent(this, 'integration.onBeforeSubmit');

        const submitAfterPayment = document.getElementById('braintree-submit-after-payment');
        if (this.submitAfterPayment && submitAfterPayment) {
            submitAfterPayment.remove();
        }

        callback();
    }

    /**
     * Event to run after submit
     *
     * @returns {boolean}
     */
    afterSubmit() {
        this.vzero.fireEvent(this, 'integration.onAfterSubmit');
        return false;
    }

    /**
     * Submit the integration to tokenize the card
     *
     * @param {string} type
     * @param {Function} successCallback
     * @param {Function} failedCallback
     * @param {Function} validateFailedCallback
     */
    submit(type, successCallback, failedCallback, validateFailedCallback) {
        this.vzero._hostedFieldsTokenGenerated = false;
        this.hostedFieldsGenerated = false;

        if (this.shouldInterceptSubmit(type)) {
            if (type !== 'creditcard' || (type === 'creditcard' && this.validateHostedFields())) {
                if (this.validateAll()) {
                    this.setLoading();

                    this.beforeSubmit(() => {
                        const cardNumber = document.querySelector('[data-genebraintree-name="number"]');
                        if (cardNumber) {
                            this.vzero.updateCardType(cardNumber.value);
                        }

                        this.vzero.updateData(
                            () => {
                                this.updateBilling();

                                this.vzero.process({
                                    onSuccess: () => {
                                        this.enableDeviceData();
                                        this.resetLoading();
                                        this.afterSubmit();
                                        this.enableDisableNonce();

                                        this.vzero._hostedFieldsTokenGenerated = true;
                                        this.hostedFieldsGenerated = true;

                                        let response;
                                        if (typeof successCallback === 'function') {
                                            response = successCallback();
                                        }

                                        this.setLoading();
                                        return response;
                                    },
                                    onFailure: () => {
                                        this.vzero._hostedFieldsTokenGenerated = false;
                                        this.hostedFieldsGenerated = false;

                                        alert(Translator.translate(
                                            'We\'re unable to process your payment, please try another card or payment method.'
                                        ));

                                        this.resetLoading();
                                        this.afterSubmit();
                                        if (typeof failedCallback === 'function') {
                                            return failedCallback();
                                        }
                                    }
                                });
                            },
                            this.getUpdateDataParams()
                        );
                    });
                } else {
                    this.vzero._hostedFieldsTokenGenerated = false;
                    this.hostedFieldsGenerated = false;

                    this.resetLoading();
                    if (typeof validateFailedCallback === 'function') {
                        validateFailedCallback();
                    }
                }
            } else {
                this.resetLoading();
            }
        }
    }

    /**
     * Submit the entire checkout
     */
    submitCheckout() {
        window.review && review.save();
    }

    /**
     * How to submit the payment section
     */
    submitPayment() {
        payment.save && payment.save();
    }

    /**
     * Enable/disable the correct nonce input fields
     */
    enableDisableNonce() {
        const creditcardNonce = document.getElementById('creditcard-payment-nonce');
        const paypalNonce = document.getElementById('paypal-payment-nonce');

        if (this.getPaymentMethod() === 'gene_braintree_creditcard') {
            if (creditcardNonce !== null) {
                creditcardNonce.removeAttribute('disabled');
            }
            if (paypalNonce !== null) {
                paypalNonce.setAttribute('disabled', 'disabled');
            }
        } else if (this.getPaymentMethod() === 'gene_braintree_paypal') {
            if (creditcardNonce !== null) {
                creditcardNonce.setAttribute('disabled', 'disabled');
            }
            if (paypalNonce !== null) {
                paypalNonce.removeAttribute('disabled');
            }
        }
    }

    /**
     * Replace the PayPal button at the correct time
     */
    preparePaymentMethodSwitchObserver() {
        return this.defaultPaymentMethodSwitch();
    }

    /**
     * If the checkout uses the Magento standard Payment.prototype.switchMethod
     */
    defaultPaymentMethodSwitch() {
        const vzeroIntegration = this;
        const paymentSwitchOriginal = Payment.prototype.switchMethod;

        Payment.prototype.switchMethod = function(method) {
            vzeroIntegration.paymentMethodSwitch(method);
            return paymentSwitchOriginal.apply(this, arguments);
        };
    }

    /**
     * Function to run when the customer changes payment method
     *
     * @param {string} method
     */
    paymentMethodSwitch(method) {
        clearTimeout(this._methodSwitchTimeout);
        this._methodSwitchTimeout = setTimeout(() => {
            if (this.shouldAddPayPalButton(method)) {
                this.updatePayPalButton('add', method);
            } else {
                this.updatePayPalButton('remove', method);
            }

            if ((method ? method : this.getPaymentMethod()) === 'gene_braintree_creditcard') {
                this.initHostedFields();
            }

            this.checkSavedOther();
            this.afterPaymentMethodSwitch();
            this.vzero.fireEvent(this, 'integration.onPaymentMethodSwitch', { method: method });
        }, 50);
    }

    /**
     * Complete a PayPal transaction
     *
     * @param {Object} obj
     * @returns {boolean}
     */
    completePayPal(obj) {
        this.enableDisableNonce();
        this.enableDeviceData();

        const paypalNonce = document.getElementById('paypal-payment-nonce');
        if (obj.nonce && paypalNonce !== null) {
            paypalNonce.value = obj.nonce;
            paypalNonce.setAttribute('value', obj.nonce);
        } else {
            console.warn('Unable to update PayPal nonce, please verify that the nonce input field has the ID: paypal-payment-nonce');
        }

        this.afterPayPalComplete();
        return false;
    }

    /**
     * Any operations that need to happen after the PayPal integration has completed
     *
     * @returns {boolean}
     */
    afterPayPalComplete() {
        this.resetLoading();
        return this.submitCheckout();
    }

    /**
     * Return the mark up for the PayPal button
     *
     * @returns {string}
     */
    getPayPalMarkUp() {
        const button = document.getElementById('braintree-paypal-button');
        return button ? button.innerHTML : '';
    }

    /**
     * Update the PayPal button on the page
     *
     * @param {string} action
     * @param {string} method
     * @returns {boolean}
     */
    updatePayPalButton(action, method) {
        if (this.paypalWrapperMarkUp === false) {
            return false;
        }

        if (action === 'refresh') {
            return true;
        }

        if ((this.shouldAddPayPalButton(method) && action !== 'remove') || action === 'add') {
            const submitButton = document.querySelector(this.paypalButtonClass);
            if (submitButton) {
                submitButton.style.display = 'none';

                const paypalComplete = document.getElementById('paypal-complete');
                if (paypalComplete) {
                    paypalComplete.style.display = '';
                    return true;
                }

                submitButton.insertAdjacentHTML('afterend', this.paypalWrapperMarkUp);

                const options = this.vzeroPaypal._buildOptions();
                options.events = {
                    validate: this.validateAll.bind(this),
                    onAuthorize: this.completePayPal.bind(this),
                    onCancel: () => {},
                    onError: (err) => {
                        alert(typeof Translator === "object" ? Translator.translate("We were unable to complete the request. Please try again.") : "We were unable to complete the request. Please try again.");
                        console.error('Error while processing payment', err);
                    }
                };

                this.vzeroPaypal.addPayPalButton(options, '#paypal-container');
            } else {
                console.warn('We\'re unable to find the element ' + this.paypalButtonClass + '. Please check your integration.');
            }
        } else {
            const submitButton = document.querySelector(this.paypalButtonClass);
            if (submitButton) {
                submitButton.style.display = '';
            }

            const paypalComplete = document.getElementById('paypal-complete');
            if (paypalComplete) {
                paypalComplete.style.display = 'none';
            }
        }
    }

    /**
     * When the review step is shown on non one step checkout solutions
     */
    onReviewInit() {
        if (!this.isOnepage) {
            this.updatePayPalButton();
        }
        this.vzero.fireEvent(this, 'integration.onReviewInit');
    }

    /**
     * Attach a click event handler to the button to validate the form
     *
     * @returns {boolean}
     */
    paypalOnReady(integration) {
        return true;
    }

    /**
     * Set the loading state
     */
    setLoading() {
        checkout.setLoadWaiting('payment');
    }

    /**
     * Reset the loading state
     */
    resetLoading() {
        checkout.setLoadWaiting(false);
    }

    /**
     * Make sure the device data field isn't disabled
     */
    enableDeviceData() {
        const deviceData = document.getElementById('device_data');
        if (deviceData !== null) {
            deviceData.removeAttribute('disabled');
        }
    }

    /**
     * Update the billing of the vZero object
     *
     * @returns {boolean}
     */
    updateBilling() {
        const billingSelect = document.getElementById('billing-address-select');
        if ((billingSelect !== null && billingSelect.value === '') || billingSelect === null) {
            const firstname = document.getElementById('billing:firstname');
            const lastname = document.getElementById('billing:lastname');
            const postcode = document.getElementById('billing:postcode');

            if (firstname !== null && lastname !== null) {
                this.vzero.setBillingName(firstname.value + ' ' + lastname.value);
            }
            if (postcode !== null) {
                this.vzero.setBillingPostcode(postcode.value);
            }
        }
    }

    /**
     * Any extra data we need to pass through to the updateData call
     *
     * @returns {Object}
     */
    getUpdateDataParams() {
        const parameters = {};
        const billingSelect = document.getElementById('billing-address-select');

        if (billingSelect !== null && billingSelect.value !== '') {
            parameters.addressId = billingSelect.value;
        }

        return parameters;
    }

    /**
     * Return the current payment method
     *
     * @returns {string}
     */
    getPaymentMethod() {
        return payment.currentMethod;
    }

    /**
     * Should we intercept the save action of the checkout
     *
     * @param {string} type
     * @returns {boolean}
     */
    shouldInterceptSubmit(type) {
        switch (type) {
            case 'creditcard':
                return (this.getPaymentMethod() === 'gene_braintree_creditcard' && this.vzero.shouldInterceptCreditCard());
            case 'paypal':
                return (this.getPaymentMethod() === 'gene_braintree_paypal' && this.vzero.shouldInterceptCreditCard());
        }
        return false;
    }

    /**
     * Should we be adding a PayPal button?
     *
     * @param {string} method
     * @returns {boolean}
     */
    shouldAddPayPalButton(method) {
        const currentMethod = method ? method : this.getPaymentMethod();
        const paypalSavedAccounts = document.getElementById('paypal-saved-accounts');
        const checkedRadio = document.querySelector('#paypal-saved-accounts input:checked[type=radio]');

        return (
            (currentMethod === 'gene_braintree_paypal' && paypalSavedAccounts === null) ||
            (currentMethod === 'gene_braintree_paypal' && checkedRadio && checkedRadio.value === 'other')
        );
    }

    /**
     * Function to run once 3D retokenization is complete
     */
    threeDTokenizationComplete() {
        this.resetLoading();
    }

    /**
     * Validate the entire form
     *
     * @returns {boolean}
     */
    validateAll() {
        return true;
    }

    /**
     * @deprecated
     */
    disableCreditCardForm() {}

    /**
     * @deprecated
     */
    enableCreditCardForm() {}
}
