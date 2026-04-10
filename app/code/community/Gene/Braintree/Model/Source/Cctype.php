<?php

declare(strict_types=1);

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 * @license https://opensource.org/licenses/osl-3.0.php Open Software License (OSL 3.0)
 */
class Gene_Braintree_Model_Source_Cctype extends Mage_Payment_Model_Source_Cctype
{
    /**
     * Allowed credit card types
     * This list includes a separate entry for Maestro
     *
     * @return array
     */
    #[\Override]
    public function getAllowedTypes()
    {
        return [
            'VI',
            'MC',
            'AE',
            'DI',
            'JCB',
            'OT',
            'ME',
        ];
    }
}
