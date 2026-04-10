<?php

/**
 * @author Craig Newbury <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Model_Source_ButtonStyle_Color
{
    public const COLOR_GOLD   = 'gold';
    public const COLOR_BLUE   = 'blue';
    public const COLOR_SILVER = 'silver';
    public const COLOUR_BLACK = 'black';

    /**
     * Availabe colours for button
     *
     * @return array
     */
    public function toOptionArray()
    {
        return [
            [
                'value' => self::COLOR_GOLD,
                'label' => Mage::helper('gene_braintree')->__('Gold (Recommended)'),
            ],
            [
                'value' => self::COLOR_BLUE,
                'label' => Mage::helper('gene_braintree')->__('Blue'),
            ],
            [
                'value' => self::COLOR_SILVER,
                'label' => Mage::helper('gene_braintree')->__('Silver'),
            ],
            [
                'value' => self::COLOUR_BLACK,
                'label' => Mage::helper('gene_braintree')->__('Black'),
            ],
        ];
    }
}
