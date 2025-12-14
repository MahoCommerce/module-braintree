<?php

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Model_Source_Environment
{
    const SANDBOX = 'sandbox';
    const PRODUCTION = 'production';

    /**
     * Display both sandbox and production values
     *
     * @return array
     */
    public function toOptionArray()
    {
        return array(
            array(
                'value' => self::SANDBOX,
                'label' => Mage::helper('gene_braintree')->__('Sandbox'),
            ),
            array(
                'value' => self::PRODUCTION,
                'label' => Mage::helper('gene_braintree')->__('Production')
            )
        );
    }
}
