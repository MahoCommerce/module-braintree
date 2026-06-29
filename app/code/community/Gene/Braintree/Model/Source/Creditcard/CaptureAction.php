<?php

/**
 * SPDX-License-Identifier: OSL-3.0
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_Source_Creditcard_CaptureAction
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
