<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Model_Source_ButtonStyle_Size
 *
 * @author Craig Newbury <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_Source_ButtonStyle_Size
{
    public const SIZE_MEDIUM       = 'medium';
    public const SIZE_LARGE        = 'large';
    public const SIZE_RESPONSIVE   = 'responsive';

    /**
     * Possible actions on order place
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => self::SIZE_MEDIUM,
                'label' => Mage::helper('gene_braintree')->__('Medium'),
            ],
            [
                'value' => self::SIZE_LARGE,
                'label' => Mage::helper('gene_braintree')->__('Large'),
            ],
            [
                'value' => self::SIZE_RESPONSIVE,
                'label' => Mage::helper('gene_braintree')->__('Responsive (Recommended)'),
            ],
        ];
    }
}
