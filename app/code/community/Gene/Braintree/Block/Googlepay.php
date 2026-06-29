<?php

declare(strict_types=1);

/**
 * SPDX-License-Identifier: OSL-3.0
 * @author Paul Canning <paul.canning@gene.co.uk>
 */
class Gene_Braintree_Block_Googlepay extends Mage_Payment_Block_Form
{
    /**
     * Class Construct
     */
    #[\Override]
    protected function _construct()
    {
        parent::_construct();
        $this->setTemplate('gene/braintree/googlepay.phtml');
    }
}
