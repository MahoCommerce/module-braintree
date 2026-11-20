<?php

/**
 * SPDX-FileCopyrightText: 2026 Maho <https://mahocommerce.com>
 * SPDX-License-Identifier: OSL-3.0
 */

declare(strict_types=1);

/** @var Gene_Braintree_Model_Entity_Setup $this */
$entityTypeId = $this->getEntityTypeId('customer');
$attributeCode = 'braintree_customer_id';
if ($this->getAttributeId($entityTypeId, $attributeCode)) {
    return true;
}

$attributeSetId = (int) $this->getDefaultAttributeSetId($entityTypeId);
$attributeGroupId = $this->getDefaultAttributeGroupId($entityTypeId, $attributeSetId);
$connection = $this->getConnection();
$connection->beginTransaction();
try {
    $this->addAttribute($entityTypeId, $attributeCode, [
        'input' => 'text',
        'type' => 'varchar',
        'label' => 'Generated Braintree Customer Account ID',
        'visible' => 0,
        'required' => 0,
        'user_defined' => 1,
    ]);
    $this->addAttributeToGroup($entityTypeId, $attributeSetId, $attributeGroupId, $attributeCode, 999);
    $connection->commit();
} catch (Throwable $exception) {
    $connection->rollBack();
    throw $exception;
}
