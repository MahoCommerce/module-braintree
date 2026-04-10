<?php

/**
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * Class Gene_Braintree_Model_Kount_Rest
 *
 * @author Dave Macaulay <braintreesupport@gene.co.uk>
 */
class Gene_Braintree_Model_Kount_Rest extends Mage_Core_Model_Abstract
{
    public const TEST_URL = 'https://api.test.kount.net/rpc/v1';
    public const PRODUCTION_URL = 'https://api.kount.net/rpc/v1';

    /**
     * Update the order status in Kount
     *
     * @param string|false            $note
     *
     * @return bool
     * @throws \Exception
     */
    public function updateOrderStatus(Mage_Sales_Model_Order $order, string $status, $note = false)
    {
        if ($note == false) {
            $note = Mage::helper('gene_braintree')->__('Order status updated by Braintree from Magento.');
        }

        $payment = $order->getPayment();
        if (!$payment) {
            return false;
        }

        // Retrieve the transaction ID from the additional information
        $transactionId = $payment->getAdditionalInformation('kount_id');

        $request = [
            'status[' . $transactionId . ']' => $status,
            'note[' . $transactionId . ']' => $note,
        ];

        try {
            $response = $this->_makeRequest('orders/status', $request);
            if (isset($response['status']) && $response['status'] == 'ok') {
                if (isset($response['count']['success']) && $response['count']['success'] == 1) {
                    $order->addStatusHistoryComment('Kount has been successfully updated to status: ' . $status . '.');
                    return true;
                }
                $order->addStatusHistoryComment('An issue has occured whilst trying to update the Kount order status: ' . implode(', ', $response['errors']));
            } else {
                $order->addStatusHistoryComment('Unable to update Kount order status.');
            }
        } catch (Exception $e) {
            $order->addStatusHistoryComment('An exception was thrown whilst trying to update the Kount order status, please consult your developer to check the logs.');
        }

        return false;
    }

    /**
     * Mark an order in Kount as refunded
     *
     * @return bool
     */
    public function updateOrderRefund(Mage_Sales_Model_Order $order)
    {
        $payment = $order->getPayment();
        if (!$payment) {
            return false;
        }

        // Retrieve the transaction ID from the additional information
        $transactionId = $payment->getAdditionalInformation('kount_id');

        $request = [
            'rfcb[' . $transactionId . ']' => 'R',
        ];

        try {
            $response = $this->_makeRequest('orders/rfcb', $request);
            if (isset($response['status']) && $response['status'] == 'ok') {
                if (isset($response['count']['success']) && $response['count']['success'] == 1) {
                    $order->addStatusHistoryComment('Kount has been successfully updated with the new refunded status.');
                    return true;
                }
                $order->addStatusHistoryComment('An issue has occurred whilst trying to update Kount with the refund status: ' . implode(', ', $response['errors']));
            } else {
                $order->addStatusHistoryComment('Unable to update Kount refund status.');
            }
        } catch (Exception $e) {
            $order->addStatusHistoryComment('An exception was thrown whilst trying to update the Kount refund status, please consult your developer to check the logs.');
        }

        return false;
    }

    /**
     * Make a request to the Kount API
     *
     * @return mixed|false
     * @throws \Exception
     */
    protected function _makeRequest(string $action, array $payload)
    {
        $url = $this->_getApiUrl($action);

        $client = \Symfony\Component\HttpClient\HttpClient::create();

        try {
            $response = $client->request('POST', $url, [
                'headers' => [
                    'X-Kount-Api-Key' => $this->_getApiKey(),
                ],
                'body' => $payload,
            ]);

            $responseBody = $response->getContent();
            if ($responseBody) {
                $decoded = Mage::helper('core')->jsonDecode($responseBody);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        } catch (Exception $e) {
            Gene_Braintree_Model_Debug::log('Communication error with Kount:');
            Gene_Braintree_Model_Debug::log($e);
            throw $e;
        }

        return false;
    }

    /**
     * Build up the API URL for a specific action
     *
     * @return string
     */
    protected function _getApiUrl(string|false $action = false)
    {
        // If the system isn't set assume sandbox
        $url = self::TEST_URL;

        if (Mage::getStoreConfig('payment/gene_braintree_creditcard/kount_environment') == Gene_Braintree_Model_Source_Environment::PRODUCTION) {
            $url = self::PRODUCTION_URL;
        }

        if ($action !== false) {
            $url .= '/' . ltrim($action, '/') . '.json';
        }

        return $url;
    }

    /**
     * Return the API key
     *
     * @return mixed
     */
    protected function _getApiKey()
    {
        return Mage::getStoreConfig('payment/gene_braintree_creditcard/kount_api_key');
    }
}
