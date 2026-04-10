<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Model_Source_Paypal_Paymenttype
 *
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_Source_Paypal_Paymenttype
{
    public const GENE_BRAINTREE_PAYPAL_SINGLE_PAYMENT = 'single';
    public const GENE_BRAINTREE_PAYPAL_FUTURE_PAYMENTS = 'future';

    /**
     * Return our options
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => self::GENE_BRAINTREE_PAYPAL_SINGLE_PAYMENT,
                'label' => Mage::helper('gene_braintree')->__('Checkout'),
            ],
            [
                'value' => self::GENE_BRAINTREE_PAYPAL_FUTURE_PAYMENTS,
                'label' => Mage::helper('gene_braintree')->__('Vault'),
            ],
        ];
    }

}
