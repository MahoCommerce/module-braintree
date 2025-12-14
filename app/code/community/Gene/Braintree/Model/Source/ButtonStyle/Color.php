<?php

/**
 * @author Craig Newbury <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Model_Source_ButtonStyle_Color
{

    const COLOR_GOLD   = 'gold';
    const COLOR_BLUE   = 'blue';
    const COLOR_SILVER = 'silver';
    const COLOUR_BLACK = 'black';

    /**
     * Availabe colours for button
     *
     * @return array
     */
    public function toOptionArray()
    {
        return array(
            array(
                'value' => self::COLOR_GOLD,
                'label' => Mage::helper('gene_braintree')->__('Gold (Recommended)')
            ),
            array(
                'value' => self::COLOR_BLUE,
                'label' => Mage::helper('gene_braintree')->__('Blue')
            ),
            array(
                'value' => self::COLOR_SILVER,
                'label' => Mage::helper('gene_braintree')->__('Silver')
            ),
            array(
                'value' => self::COLOUR_BLACK,
                'label' => Mage::helper('gene_braintree')->__('Black')
            ),
        );
    }
}
