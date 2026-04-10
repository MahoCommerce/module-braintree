<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
abstract class Gene_Braintree_Model_Paymentmethod_Abstract extends Mage_Payment_Model_Method_Abstract
{
    /**
     * The decision responses from braintree
     */
    public const ADVANCED_FRAUD_REVIEW = 'Review';
    public const ADVANCED_FRAUD_DECLINE = 'Decline';
    public const BRAINTREE_ORIGINAL_TOKEN = 'gene_braintree_original_token';

    /**
     * Verify that the module has been setup
     *
     * @param null $quote
     *
     * @return bool
     */
    #[\Override]
    public function isAvailable($quote = null)
    {
        // Check Magento's internal methods allow us to run
        if (parent::isAvailable($quote)) {
            // Validate the configuration is okay
            return $this->_getWrapper()->validateCredentialsOnce();
        }
        // Otherwise it's a no
        return false;
    }

    /**
     * @return Gene_Braintree_Helper_Data
     */
    #[\Override]
    protected function _getHelper()
    {
        return Mage::helper('gene_braintree');
    }

    /**
     * Return the wrapper class
     *
     * @return Gene_Braintree_Model_Wrapper_Braintree
     */
    protected function _getWrapper()
    {
        return Mage::getSingleton('gene_braintree/wrapper_braintree');
    }

    /**
     * Return configuration values
     *
     * @return mixed
     */
    protected function _getConfig(string $key)
    {
        return Mage::getStoreConfig('payment/' . $this->_code . '/' . $key);
    }

    /**
     * Handle any risk decision returned from Braintree
     *
     * @return $this
     */
    protected function handleFraud(Braintree\Result\Successful|Braintree\Result\Error $result, Varien_Object $payment)
    {
        // Verify we have risk data
        $transaction = $result->transaction ?? null;
        if (!$transaction) {
            return $this;
        }
        $riskData = $transaction->riskData;
        if ($riskData && $riskData->decision) {
            // If the merchant has specified the merchant and website ID we can update the payments status
            if (Mage::helper('gene_braintree')->canUpdateKount() && $riskData->id) {
                /** @var Mage_Sales_Model_Order_Payment $payment */
                // Update the payment with the require information
                $payment->setAdditionalInformation('kount_id', $riskData->id);
                $payment->save();
            }

            // If the decision is to review the payment mark the payment as such
            if ($riskData->decision == self::ADVANCED_FRAUD_REVIEW ||
                $riskData->decision == self::ADVANCED_FRAUD_DECLINE
            ) {
                // Mark the payment as pending
                $payment->setIsTransactionPending(true);

                // If the payment got marked as fraud/decline, we mark it as fraud
                if ($riskData->decision == self::ADVANCED_FRAUD_DECLINE) {
                    $payment->setIsFraudDetected(true);
                }

            }
        }

        return $this;
    }

    /**
     * Refund specified amount for payment
     *
     * @param float          $amount
     *
     * @return $this
     * @throws \Mage_Core_Exception
     */
    #[\Override]
    public function refund(Varien_Object $payment, $amount)
    {
        try {
            // Attempt to load the invoice
            /* @var $invoice Mage_Sales_Model_Order_Invoice */
            $invoice = $payment->getCreditmemo()->getInvoice();
            if (!$invoice) {
                Mage::throwException('Unable to load invoice from credit memo.');
            }

            // Init the environment
            $this->_getWrapper()->init($payment->getOrder()->getStoreId());

            // Retrieve the refund amount
            $refundAmount = Mage::helper('gene_braintree')->formatPrice($amount);

            // Retrieve the transaction ID
            $transactionId = $this->_getWrapper()->getCleanTransactionId($invoice->getTransactionId());

            // Load the transaction from Braintree
            $transaction = Braintree\Transaction::find($transactionId);

            // If the transaction hasn't yet settled we can't do partial refunds
            if ($transaction->status === Braintree\Transaction::SUBMITTED_FOR_SETTLEMENT) {
                // If we're doing a partial refund and it's not settled it's a no go
                if ($transaction->amount != $refundAmount) {
                    Mage::throwException(
                        $this->_getHelper()->__('This transaction has not yet settled, please wait until the ' .
                        'transaction has settled to process a partial refund.'),
                    );
                }
            }

            // Determine if the transaction is settled, or settling
            if (($transaction->status == Braintree\Transaction::SETTLED ||
                    $transaction->status == Braintree\Transaction::SETTLING) ||
                (
                    isset($transaction->paypal) &&
                    isset($transaction->paypal['paymentId']) &&
                    !empty($transaction->paypal['paymentId'])
                )
            ) {
                $result = Braintree\Transaction::refund($transactionId, $refundAmount);
            } else {
                $result = Braintree\Transaction::void($transactionId);
            }

            // If it's a success close the transaction
            if ($result->success) {
                // Pass over the transaction ID
                $payment->getCreditmemo()->setRefundTransactionId($result->transaction->id);

                // Only close the transaction once the transaction amount meets the refund amount
                if ($transaction->amount == $refundAmount) {
                    $payment->setIsTransactionClosed(1);

                    // Mark the invoice as canceled if the invoice was completely refunded
                    $invoice->setState(Mage_Sales_Model_Order_Invoice::STATE_CANCELED);

                    // Only update Kount to say the transaction is refunded if the whole transaction is refunded
                    $this->_updateKountRefund($payment);
                }

            } else {
                if ($result->errors->deepSize() > 0) {
                    Mage::throwException($this->_getWrapper()->parseErrors($result->errors->deepAll()));
                } else {
                    Mage::throwException('An unknown error has occurred whilst trying to process the transaction');
                }
            }

        } catch (Exception $e) {
            Mage::throwException(
                $this->_getHelper()->__('An error occurred whilst trying to process the refund: ') . $e->getMessage(),
            );
        }

        return $this;
    }

    /**
     * Cancel a payment, refunding the order
     *
     * @return $this
     */
    #[\Override]
    public function cancel(Varien_Object $payment)
    {
        $this->void($payment);

        return $this;
    }

    /**
     * Void payment abstract method
     *
     * @return $this
     */
    #[\Override]
    public function void(Varien_Object $payment)
    {
        try {
            // Init the environment
            $this->_getWrapper()->init($payment->getOrder()->getStoreId());

            // Retrieve the transaction ID
            $transactionId = $this->_getWrapper()->getCleanTransactionId($payment->getLastTransId());

            // Load the transaction from Braintree
            $transaction = Braintree\Transaction::find($transactionId);

            // We can only void authorized and submitted for settlement transactions
            if ($transaction->status == Braintree\Transaction::AUTHORIZED ||
                $transaction->status == Braintree\Transaction::SUBMITTED_FOR_SETTLEMENT
            ) {
                $result = Braintree\Transaction::void($transactionId);
            } else {
                // If the transaction isn't voidable, refund it
                /** @var Braintree\Result\Successful|Braintree\Result\Error $result */
                $result = Braintree\Transaction::refund($transactionId);
            }

            // If it's a success close the transaction
            if ($result->success) {
                $payment->setIsTransactionClosed(1);
            } else {
                if ($result->errors->deepSize() > 0) {
                    Mage::throwException($this->_getWrapper()->parseErrors($result->errors->deepAll()));
                } else {
                    Mage::throwException('Unknown');
                }
            }

        } catch (Exception $e) {
            Mage::throwException(
                $this->_getHelper()->__('An error occurred whilst trying to void the transaction: %s', $e->getMessage()),
            );
        }

        return $this;
    }

    /**
     * Set transaction ID into creditmemo for informational purposes
     *
     * @param Mage_Sales_Model_Order_Creditmemo $creditmemo
     * @param Mage_Sales_Model_Order_Payment $payment
     * @return $this
     */
    #[\Override]
    public function processCreditmemo($creditmemo, $payment)
    {
        // Copy the refund transaction ID from the credit memo
        $creditmemo->setTransactionId($creditmemo->getRefundTransactionId());
        return $this;
    }

    /**
     * If we're doing authorize, has the payment already got more than one transaction?
     *
     * @return int
     */
    public function authorizationUsed(Varien_Object $payment)
    {
        $collection = Mage::getModel('sales/order_payment_transaction')
            ->getCollection()
            ->addFieldToFilter('payment_id', $payment->getId())
            ->addFieldToFilter('txn_type', Mage_Sales_Model_Order_Payment_Transaction::TYPE_CAPTURE);

        return $collection->getSize();
    }

    /**
     * Accept a payment that landed in payment review
     *
     * @return Mage_Sales_Model_Order_Invoice|bool
     */
    #[\Override]
    public function acceptPayment(Mage_Payment_Model_Info $payment)
    {
        parent::acceptPayment($payment);

        /* @var $order Mage_Sales_Model_Order */
        $order = $payment->getOrder();

        /* @var Mage_Sales_Model_Order_Invoice|false $invoice */
        $invoice = $this->_getInvoiceForTransactionId($payment, $payment->getLastTransId());
        if ($invoice && $invoice->getId()) {
            if ($invoice->getState() == Mage_Sales_Model_Order_Invoice::STATE_PAID) {
                // Invoice is already paid and captured, just move the order into processing
                return false;
            }
            if ($invoice->canCapture()) {
                return $invoice->capture();
            }
        } else {
            $orderPayment = $order->getPayment();
            if ($orderPayment && $orderPayment->canCapture()) {
                // We don't currently have an invoice for this order, let's create one whilst capturing
                $orderPayment->capture(null);
                /* @var $createdInvoice Mage_Sales_Model_Order_Invoice */
                $createdInvoice = $orderPayment->getCreatedInvoice();
                // Mark the invoice as paid
                $createdInvoice->pay();
                return true;
            }
        }

        Mage::throwException(
            Mage::helper('payment')->__('Unable to load invoice to accept the payment for this order.'),
        );
    }

    /**
     * Deny a payment that landed in payment review
     *
     * @return Mage_Sales_Model_Order_Invoice|bool
     */
    #[\Override]
    public function denyPayment(Mage_Payment_Model_Info $payment)
    {
        parent::denyPayment($payment);

        /* @var Mage_Sales_Model_Order_Invoice|false $invoice */
        $invoice = $this->_getInvoiceForTransactionId($payment, $payment->getLastTransId());
        if ($invoice && $invoice->getId()) {
            if ($invoice->getState() == Mage_Sales_Model_Order_Invoice::STATE_CANCELED) {
                // Invoice has already been cancelled
                return false;
            }
            return $invoice->void();
        }
        // The order has no invoice, let's void the payment directly
        $this->_getWrapper()->init();
        $transaction = Braintree\Transaction::find($payment->getLastTransId());
        if ($transaction->status == Braintree\Transaction::AUTHORIZED) {
            try {
                Braintree\Transaction::void($payment->getLastTransId());
                return true;
            } catch (Exception $e) {
                // Let's add the error into the session
                Mage::getSingleton('adminhtml/session')->addError($e->getMessage());
                return false;
            }
        }

        Mage::throwException(Mage::helper('payment')->__('Unable to load invoice to deny the payment for this order.'));
    }

    /**
     * Update the order status within Kount
     *
     * @param string         $status
     * @return $this
     */
    protected function _updateKountStatus(Varien_Object $payment, $status = 'A')
    {
        if (Mage::helper('gene_braintree')->canUpdateKount() &&
            ($kountId = $payment->getAdditionalInformation('kount_id'))
        ) {
            $kountRest = Mage::getModel('gene_braintree/kount_rest');
            $kountRest->updateOrderStatus($payment->getOrder(), $status);
        }

        return $this;
    }

    /**
     * Update Kount when an order is refunded
     *
     * @return $this
     */
    protected function _updateKountRefund(Varien_Object $payment)
    {
        if (Mage::helper('gene_braintree')->canUpdateKount()
            && ($kountId = $payment->getAdditionalInformation('kount_id'))
        ) {
            $kountRest = Mage::getModel('gene_braintree/kount_rest');
            $kountRest->updateOrderRefund($payment->getOrder());
        }

        return $this;
    }

    /**
     * Dispatch the event for the sale array
     *
     * @return mixed
     */
    protected function _dispatchSaleArrayEvent(string $event, array $saleArray, Varien_Object $payment)
    {
        // Pass the sale array into a varien object
        $request = new Varien_Object();
        $request->setData('sale_array', $saleArray);

        // Dispatch event for modifying the sale array
        Mage::dispatchEvent($event, ['payment' => $payment, 'request' => $request]);

        // Pull the saleArray back out
        $saleArray = $request->getData('sale_array');

        // Log the initial sale array, no protected data is included
        Gene_Braintree_Model_Debug::log(['_authorize:saleArray' => $saleArray]);

        return $saleArray;
    }

    /**
     * Process a failed payment
     *
     * @return $this
     * @throws \Mage_Core_Exception
     */
    protected function _processFailedResult(string $message, mixed $log = false, mixed $result = false)
    {
        // Clean up from any other operations that have occured
        Gene_Braintree_Model_Wrapper_Braintree::cleanUp();

        if ($log !== false) {
            Gene_Braintree_Model_Debug::log($log);
            Mage::throwException($message);
        }

        // Use Mage_Payment_Model_Info_Exception for expected payment failures (e.g. processor
        // declines) so they are not logged as exceptions in exception.log
        throw new Mage_Payment_Model_Info_Exception($message);
    }

    /**
     * Return the token generated from the initial transaction
     *
     * @return mixed
     */
    protected function _getOriginalToken()
    {
        return Mage::registry(self::BRAINTREE_ORIGINAL_TOKEN);
    }

    /**
     * Set the original token
     *
     * @return $this
     */
    protected function _setOriginalToken(string $token)
    {
        Mage::register(self::BRAINTREE_ORIGINAL_TOKEN, $token);

        return $this;
    }

    /**
     * Return invoice model for transaction
     *
     * @return Mage_Sales_Model_Order_Invoice|false
     */
    protected function _getInvoiceForTransactionId(Varien_Object $payment, string $transactionId)
    {
        foreach ($payment->getOrder()->getInvoiceCollection() as $invoice) {
            if ($invoice->getTransactionId() == $transactionId) {
                $invoice->load($invoice->getId());
                return $invoice;
            }
        }
        foreach ($payment->getOrder()->getInvoiceCollection() as $invoice) {
            if ($invoice->getState() == Mage_Sales_Model_Order_Invoice::STATE_OPEN
                && $invoice->load($invoice->getId())
            ) {
                $invoice->setTransactionId($transactionId);
                return $invoice;
            }
        }
        return false;
    }
}
