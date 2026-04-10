<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Model_Source_Paypal_CaptureAction
{
    public const CAPTURE_ACTION_XML_PATH = 'payment/gene_braintree_creditcard/capture_action';

    public const CAPTURE_INVOICE = 'invoice';
    public const CAPTURE_SHIPMENT = 'shipment';

    /**
     * Possible actions on order place
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => self::CAPTURE_INVOICE,
                'label' => Mage::helper('gene_braintree')->__('Invoice'),
            ],
            [
                'value' => self::CAPTURE_SHIPMENT,
                'label' => Mage::helper('gene_braintree')->__('Shipment'),
            ],
        ];
    }
}
