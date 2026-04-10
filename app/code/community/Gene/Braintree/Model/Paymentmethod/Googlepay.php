<?php

/**
 * @author Paul Canning <paul.canning@gene.co.uk>
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */
class Gene_Braintree_Model_Paymentmethod_Googlepay extends Gene_Braintree_Model_Paymentmethod_Abstract
{
    /**
     * @var string $_code
     */
    protected $_code = 'gene_braintree_googlepay';

    /**
     * @var string $_formBlockType
     */
    protected $_formBlockType = 'gene_braintree/googlepay';

    /**
     * @var string $_infoBlockType
     */
    protected $_infoBlockType = 'gene_braintree/googlepay_info';

    /**
     * @var bool $_isGateway
     */
    protected $_isGateway = false;

    /**
     * @var bool $_canOrder
     */
    protected $_canOrder = false;

    /**
     * @var bool $_canAuthorize
     */
    protected $_canAuthorize = true;

    /**
     * @var bool $_canCapture
     */
    protected $_canCapture = true;

    /**
     * @var bool $_canCapturePartial
     */
    protected $_canCapturePartial = false;

    /**
     * @var bool $_canRefund
     */
    protected $_canRefund = true;

    /**
     * @var bool $_canRefundInvoicePartial
     */
    protected $_canRefundInvoicePartial = true;

    /**
     * @var bool $_canVoid
     */
    protected $_canVoid = true;

    /**
     * @var bool $_canUseInternal
     */
    protected $_canUseInternal = false;

    /**
     * @var bool $_canUseCheckout
     */
    protected $_canUseCheckout = true;

    /**
     * @var bool $_canUseForMultishipping
     */
    protected $_canUseForMultishipping = true;

    /**
     * @var bool $_isInitializeNeeded
     */
    protected $_isInitializeNeeded = false;

    /**
     * @var bool $_canFetchTransactionInfo
     */
    protected $_canFetchTransactionInfo = false;

    /**
     * @var bool $_canReviewPayment
     */
    protected $_canReviewPayment = true;

    /**
     * @var bool $_canCreateBillingAgreement
     */
    protected $_canCreateBillingAgreement = false;

    /**
     * @var bool $_canManageRecurringProfiles
     */
    protected $_canManageRecurringProfiles = false;

    /**
     * @param null $quote
     * @return bool
     */
    #[\Override]
    public function isAvailable($quote = null)
    {
        if (parent::isAvailable($quote)) {
            return true;
        }

        return false;
    }

    /**
     * @param $data
     * @return $this
     */
    #[\Override]
    public function assignData($data)
    {
        if (!($data instanceof Varien_Object)) {
            $data = new Varien_Object($data);
        }

        $info = $this->getInfoInstance();
        $info->setAdditionalInformation('payment_method_nonce', $data->getData('payment_method_nonce'))
            ->setAdditionalInformation('device_data', $data->getData('device_data'));

        return $this;
    }

    /**
     * @return array|mixed|null
     */
    public function getPaymentMethodNonce()
    {
        return $this->getInfoInstance()->getAdditionalInformation('payment_method_nonce');
    }

    /**
     * Authorize the requested amount
     *
     * @param float $amount
     * @return Gene_Braintree_Model_Paymentmethod_Googlepay
     * @throws Mage_Core_Exception
     */
    #[\Override]
    public function authorize(Varien_Object $payment, $amount)
    {
        return $this->_authorize($payment, $amount);
    }

    /**
     * Process capturing of a payment
     *
     * @param float $amount
     * @return $this
     */
    #[\Override]
    public function capture(Varien_Object $payment, $amount)
    {
        return $this->_captureAuthorized($payment, $amount);
    }

    /**
     * Pseudo _authorize function so we can pass in extra data
     *
     * @return $this
     * @throws Mage_Core_Exception
     */
    protected function _authorize(Varien_Object $payment, string|float $amount, bool $shouldCapture = false, string|false $token = false)
    {
        // Confirm that we have a nonce from Braintree
        // We cannot utilise the validate() function as these checks need to happen at the capture point
        if (!$this->getPaymentMethodNonce()) {
            Mage::throwException(
                $this->_getHelper()->__('There has been an issue processing your Google Pay payment, please try again.'),
            );
        }

        // Init the environment
        $this->_getWrapper()->init();

        // Retrieve the amount we should capture
        $amount = $this->_getWrapper()->getCaptureAmount($payment->getOrder(), $amount);

        // Attempt to create the sale
        try {
            // Build up the sale array
            $saleArray = $this->_getWrapper()->buildSale(
                $amount,
                $this->_buildPaymentRequest($token),
                $payment->getOrder(),
                $shouldCapture,
                $this->getInfoInstance()->getAdditionalInformation('device_data'),
            );

            // Attempt to make the sale, firstly dispatching an event
            $result = $this->_getWrapper()->makeSale(
                $this->_dispatchSaleArrayEvent('gene_braintree_googlepay_sale_array', $saleArray, $payment),
            );

        } catch (Exception $e) {
            // Dispatch an event for when a payment fails
            Mage::dispatchEvent('gene_braintree_googlepay_failed_exception', ['payment' => $payment, 'exception' => $e]);

            return $this->_processFailedResult($this->_getHelper()->__('We were unable to complete your purchase through Google Pay, please try again or an alternative payment method.'), $e);
        }

        // Log the result
        Gene_Braintree_Model_Debug::log(['result' => $result]);

        // If the sale has failed
        if ($result->success !== true) {
            // Dispatch an event for when a payment fails
            Mage::dispatchEvent('gene_braintree_googlepay_failed', ['payment' => $payment, 'result' => $result]);

            // Return a friendly message for processor declined transactions
            if (isset($result->transaction->status)
                && $result->transaction->status == Braintree\Transaction::PROCESSOR_DECLINED
            ) {
                return $this->_processFailedResult(
                    $this->_getHelper()->__(
                        'Your transaction has been declined, please try another payment method or contacting your issuing bank.',
                    ),
                    false,
                    $result,
                );
            }

            return $this->_processFailedResult($this->_getHelper()->__('%s. Please try again or attempt refreshing the page.', rtrim($result->message, '.')));
        }

        $this->_processSuccessResult($payment, $result, $amount);

        return $this;
    }

    /**
     * @return $this
     */
    protected function _captureAuthorized(Varien_Object $payment, string|float $amount)
    {
        // Has the payment already been authorized?
        if ($payment->getCcTransId()) {
            // Convert the capture amount to the correct currency
            $captureAmount = $this->_getWrapper()->getCaptureAmount($payment->getOrder(), $amount);
            // Check to see if the transaction has already been captured
            $lastTransactionId = $payment->getLastTransId();
            if ($lastTransactionId) {
                try {
                    $this->_getWrapper()->init($payment->getOrder()->getStoreId());
                    $transaction = Braintree\Transaction::find($lastTransactionId);
                    // Has the transaction already been settled? or submitted for the settlement?
                    // Also treat settling transaction as being process. Case #828048
                    // Do the capture amounts match?
                    if (isset($transaction->id) &&
                        (
                            $transaction->status === Braintree\Transaction::SUBMITTED_FOR_SETTLEMENT ||
                            $transaction->status === Braintree\Transaction::SETTLED ||
                            $transaction->status === Braintree\Transaction::SETTLING
                        ) && $captureAmount === $transaction->amount
                    ) {
                        // We can just approve the invoice
                        $this->_updateKountStatus($payment);
                        $payment->setStatus(self::STATUS_APPROVED);
                        return $this;
                    }
                } catch (Exception $e) {
                    // Unable to load transaction, so process as below
                }
            }
            // Has the authorization already been settled? Partial invoicing
            if ($this->authorizationUsed($payment)) {
                // Set the token as false
                $token = false;
                // Was the original payment created with a token?
                if ($additionalInfoToken = $payment->getAdditionalInformation('token')) {
                    try {
                        // Init the environment
                        $this->_getWrapper()->init($payment->getOrder()->getStoreId());
                        // Attempt to find the token
                        Braintree\PaymentMethod::find($additionalInfoToken);
                        // Set the token if a success
                        $token = $additionalInfoToken;
                    } catch (Exception $e) {
                        $token = false;
                    }
                }
                // If we managed to find a token use that for the capture
                if ($token) {
                    // Stop processing the rest of the method
                    // We pass $amount instead of $captureAmount as the authorize function contains the conversion
                    $this->_authorize($payment, $amount, true, $token);
                    return $this;
                }
                // Attempt to clone the transaction
                $result = $this->_getWrapper()
                    ->init($payment->getOrder()->getStoreId())
                    ->cloneTransaction($lastTransactionId, $captureAmount);
            } else {
                // Init the environment
                $result = $this->_getWrapper()
                    ->init($payment->getOrder()->getStoreId())
                    ->submitForSettlement($payment->getCcTransId(), $captureAmount);
                // Log the result
                Gene_Braintree_Model_Debug::log(['capture:submitForSettlement' => $result]);
            }
            if (!$result) {
                Gene_Braintree_Model_Wrapper_Braintree::cleanUp();
                Mage::throwException('Unable to process the transaction.');
            } elseif ($result->success) {
                $this->_updateKountStatus($payment);
                $this->_processSuccessResult($payment, $result, $amount);
            } elseif ($result->errors->deepSize() > 0) {
                // Clean up
                Gene_Braintree_Model_Wrapper_Braintree::cleanUp();
                Mage::throwException($this->_getWrapper()->parseErrors($result->errors->deepAll()));
            } else {
                // Clean up
                Gene_Braintree_Model_Wrapper_Braintree::cleanUp();
                Mage::throwException(
                    $result->transaction->processorSettlementResponseCode . ':
                    ' . $result->transaction->processorSettlementResponseText,
                );
            }
        } else {
            // Otherwise we need to do an auth & capture at once
            $this->_authorize($payment, $amount, true);
        }

        return $this;
    }

    /**
     * @return array
     */
    protected function _buildPaymentRequest(string|false $token)
    {
        // Build our payment array with either our token, or nonce
        $paymentArray = [];

        // If we have an original token use that for the subsequent requests
        if ($originalToken = $this->_getOriginalToken()) {
            $paymentArray['paymentMethodToken'] = $originalToken;
            return $paymentArray;
        }

        $paymentArray['paymentMethodNonce'] = $this->getPaymentMethodNonce();

        // If a token is present in the request use that
        if ($token) {
            // Remove this unneeded data
            unset($paymentArray['paymentMethodNonce']);

            // Send the token as the payment array
            $paymentArray['paymentMethodToken'] = $token;
        }

        return $paymentArray;
    }

    /**
     * @return Varien_Object
     */
    protected function _processSuccessResult(Varien_Object $payment, Braintree\Result\Successful|Braintree\Result\Error $result, string|float $amount)
    {
        // Pass an event if the payment was a success
        Mage::dispatchEvent('gene_braintree_googlepay_success', [
            'payment' => $payment,
            'result' => $result,
            'amount' => $amount,
        ]);

        // Set some basic things
        $payment->setStatus(self::STATUS_APPROVED)
            ->setCcTransId($result->transaction->id)
            ->setLastTransId($result->transaction->id)
            ->setTransactionId($result->transaction->id)
            ->setIsTransactionClosed(0)
            ->setAmount($amount)
            ->setShouldCloseParentTransaction(false);

        // Set information about the card
        $payment->setCcOwner($result->transaction->customerDetails->firstName . ' ' . $result->transaction->customerDetails->lastName)
            ->setCcLast4($result->transaction->googlePayCardDetails->last4)
            ->setCcType($result->transaction->googlePayCardDetails->cardType)
            ->setCcExpMonth($result->transaction->googlePayCardDetails->expirationMonth)
            ->setCcExpYear($result->transaction->googlePayCardDetails->expirationYear);

        // Handle any fraud response from Braintree
        $this->handleFraud($result, $payment);

        return $payment;
    }
}
