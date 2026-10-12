<?php

declare(strict_types=1);

/**
 * The card networks that Braintree accepts through Apple Pay. Each value is an Apple Pay network name.
 *
 * SPDX-FileCopyrightText: 2026 Maho <https://mahocommerce.com>
 * SPDX-License-Identifier: OSL-3.0
 */
class Gene_Braintree_Model_Source_Applepay_AcceptedCards
{
    public function toOptionArray(): array
    {
        $helper = Mage::helper('gene_braintree');

        return [
            ['value' => 'amex', 'label' => $helper->__('American Express')],
            ['value' => 'discover', 'label' => $helper->__('Discover')],
            ['value' => 'elo', 'label' => $helper->__('Elo')],
            ['value' => 'maestro', 'label' => $helper->__('Maestro')],
            ['value' => 'masterCard', 'label' => $helper->__('Mastercard')],
            ['value' => 'visa', 'label' => $helper->__('Visa')],
        ];
    }
}
