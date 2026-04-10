<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Model_Source_ButtonStyle_Shape
 *
 * @author Craig Newbury <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_Source_ButtonStyle_Shape
{
    public const SHAPE_PILL = 'pill';
    public const SHAPE_RECTANGLE = 'rect';

    /**
     * Possible actions on order place
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => self::SHAPE_PILL,
                'label' => Mage::helper('gene_braintree')->__('Pill'),
            ],
            [
                'value' => self::SHAPE_RECTANGLE,
                'label' => Mage::helper('gene_braintree')->__('Rectangle (Recommended)'),
            ],
        ];
    }
}
