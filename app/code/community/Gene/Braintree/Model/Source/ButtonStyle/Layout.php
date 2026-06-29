<?php

/**
 * SPDX-License-Identifier: OSL-3.0
 *
 * @author Craig Newbury <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_Source_ButtonStyle_Layout
{
    public const LAYOUT_VERTICAL = 'vertical';
    public const LAYOUT_HORIZONTAL = 'horizontal';


    /**
     * Possible actions on order place
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => self::LAYOUT_VERTICAL,
                'label' => Mage::helper('gene_braintree')->__('Vertical (All buttons)'),
            ],
            [
                'value' => self::LAYOUT_HORIZONTAL,
                'label' => Mage::helper('gene_braintree')->__('Horizontal (Max 2 Buttons)'),
            ],
        ];
    }
}
