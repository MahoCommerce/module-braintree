<?php

declare(strict_types=1);

/**
 * SPDX-License-Identifier: OSL-3.0
 */

/**
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
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
