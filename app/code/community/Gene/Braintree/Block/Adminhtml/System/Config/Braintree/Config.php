<?php

/**
 * SPDX-License-Identifier: OSL-3.0
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Block_Adminhtml_System_Config_Braintree_Config extends Mage_Adminhtml_Block_Abstract implements Varien_Data_Form_Element_Renderer_Interface
{
    /**
     * Render element html
     *
     * @return string
     */
    #[\Override]
    public function render(Varien_Data_Form_Element_Abstract $element)
    {
        return sprintf(
            '<tr id="row_%s">
                <td class="label">
                    <strong id="%s">%s</strong>
                </td>
                <td class="value">
                    %s
                </td>
            </tr>',
            $element->getHtmlId(),
            $element->getHtmlId(),
            $element->getLabel(),
            $this->getValidConfigHtml(),
        );
    }

    /**
     * Inform the user there version will not work
     * @return string
     */
    protected function getValidConfigHtml()
    {
        $response = Mage::getModel('gene_braintree/wrapper_braintree')->validateCredentials(true);
        $response .= '
<script type="text/javascript">

// Set the config timeout
var configTimeout;

// Make a request to the server and validate the configuration options
function checkConfig() {

    // Clear any timeout already set
    clearTimeout(configTimeout);

    // Place a loading gif into the config area
    var valueCell = document.querySelector(\'#row_payment_gene_braintree_valid_config td.value\');
    valueCell.innerHTML = \'<div style="line-height: 18px;margin: 6px 0;"><img src="' . $this->getSkinUrl('images/gene/loader.gif') . '" height="18" style="float: left;margin-right: 8px;" /> ' . $this->__('Validating Credentials...') . '</div>\';

    // Defined the configTimeout
    configTimeout = setTimeout(function() {
        var body = new URLSearchParams();
        document.querySelectorAll(\'.validate-config\').forEach(function(element) {
            if (!element.disabled) {
                body.append(element.name, element.value);
            }
        });

        mahoFetch("' . Mage::helper('adminhtml')->getUrl('adminhtml/braintree/validateConfig') . '", {method: "post", body: body, loaderArea: false})
            .then(function(response) {
                valueCell.innerHTML = response;
            });
    }, 800);
}

// Observe the relevant form elements
document.querySelectorAll(\'input.validate-config\').forEach(function(element) {
    element.addEventListener(\'keyup\', checkConfig);
});
document.querySelectorAll(\'select.validate-config\').forEach(function(element) {
    element.addEventListener(\'change\', checkConfig);
});
</script>';
        return $response;
    }
}
