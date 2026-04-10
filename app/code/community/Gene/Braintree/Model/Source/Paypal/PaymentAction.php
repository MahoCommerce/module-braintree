<?php

class Gene_Braintree_Model_Source_Paypal_PaymentAction
{
    public const PAYMENT_ACTION_XML_PATH = 'payment/gene_braintree_paypal/payment_action';

    /**
     * Possible actions on order place
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => Mage_Payment_Model_Method_Abstract::ACTION_AUTHORIZE,
                'label' => Mage::helper('gene_braintree')->__('Authorize'),
            ],
            [
                'value' => Mage_Payment_Model_Method_Abstract::ACTION_AUTHORIZE_CAPTURE,
                'label' => Mage::helper('gene_braintree')->__('Authorize & Capture'),
            ],
        ];
    }
}
