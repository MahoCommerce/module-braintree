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
     * @param {*} _unused Reserved for backwards compatibility
     * @param {*} _unused2 Reserved for backwards compatibility
     * @param {string} submitButtonClass The class of the submit button
     * @param {boolean} isOnepage Is the integration a onepage checkout?
     * @param {Object} config Any further config the integration wants to push into the class
     * @param {boolean} submitAfterPayment Is the checkout going to submit the payment after the payment step?
     */
    constructor(vzero, _unused, _unused2, submitButtonClass, isOnepage, config, submitAfterPayment) {
        if (vZeroIntegration.loaded) {
            console.error('Your checkout is including the Braintree resources multiple times, please resolve this.');
            return false;
        }
        vZeroIntegration.loaded = true;

        this.vzero = vzero || false;

        if (this.vzero === false) {
            console.warn('The vzero object is not initiated.');
            return false;
        }

        this.submitButtonClass = submitButtonClass || false;

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

            braintree.dataCollector.create(params, (err, dataCollectorInstance) => {
                if (err) {
                    if (err.code !== 'DATA_COLLECTOR_KOUNT_NOT_ENABLED') {
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
        document.querySelectorAll('#creditcard-saved-accounts input[type="radio"]').forEach((element) => {
            let parentElement = '#creditcard-saved-accounts';
            let targetElement = '#credit-card-form';

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
     * Hide or show the "other" method for Credit Card
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
     * @param {string} [googlePayNonce] - If provided (from Google Pay flow), set on input immediately before save so it is not lost
     */
    submitCheckout(googlePayNonce) {
        const nonceEl = document.getElementById('googlepay-payment-nonce');
        if (typeof googlePayNonce === 'string' && googlePayNonce.length > 0 && nonceEl) {
            nonceEl.value = googlePayNonce;
            nonceEl.removeAttribute('disabled');
        }
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
        const nonceFields = {
            'gene_braintree_creditcard': document.getElementById('creditcard-payment-nonce'),
            'gene_braintree_googlepay': document.getElementById('googlepay-payment-nonce'),
            'gene_braintree_applepay': document.getElementById('applepay-payment-nonce'),
        };

        const activeMethod = this.getPaymentMethod();

        for (const [method, field] of Object.entries(nonceFields)) {
            if (field === null) continue;
            if (method === activeMethod) {
                field.removeAttribute('disabled');
            } else {
                field.setAttribute('disabled', 'disabled');
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
            if ((method ? method : this.getPaymentMethod()) === 'gene_braintree_creditcard') {
                this.initHostedFields();
            }

            this.checkSavedOther();
            this.afterPaymentMethodSwitch();
            this.vzero.fireEvent(this, 'integration.onPaymentMethodSwitch', { method: method });
        }, 50);
    }

    /**
     * When the review step is shown on non one step checkout solutions
     */
    onReviewInit() {
        this.vzero.fireEvent(this, 'integration.onReviewInit');
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
        }
        return false;
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

    /**
     * Add methods to the class prototype (Prototype.js compatibility)
     *
     * @param {Object} methods
     */
    static addMethods(methods) {
        Object.assign(vZeroIntegration.prototype, methods);
    }
}
