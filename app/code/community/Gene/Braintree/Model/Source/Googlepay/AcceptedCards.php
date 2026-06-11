<?php

/**
 * SPDX-License-Identifier: OSL-3.0
 */

/**
 * @author Paul Canning <paul.canning@gene.co.uk>
 */
class Gene_Braintree_Model_Source_Googlepay_AcceptedCards
{
    /**
     * Return the array of options
     *
     * @return array
     */
    public function getArray()
    {
        return [
            'AMEX' => Mage::helper('gene_braintree')->__('American Express'),
            'DISCOVER' => Mage::helper('gene_braintree')->__('Discovery'),
            'INTERAC' => Mage::helper('gene_braintree')->__('Interac'),
            'JCB' => Mage::helper('gene_braintree')->__('JCB'),
            'MASTERCARD' => Mage::helper('gene_braintree')->__('Mastercard'),
            'VISA' => Mage::helper('gene_braintree')->__('Visa'),
        ];
    }

    /**
     * Options getter
     *
     * @return array
     */
    public function toOptionArray()
    {
        $response = [];
        foreach ($this->getArray() as $key => $value) {
            $response[] = [
                'value' => $key,
                'label' => $value,
            ];
        }
        return $response;
    }

    /**
     * Get options in "key-value" format
     *
     * @return array
     */
    public function toArray()
    {
        return $this->getArray();
    }

}
