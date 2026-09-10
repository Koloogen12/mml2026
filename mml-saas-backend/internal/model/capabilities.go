package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// Capabilities describes what a provider can actually do.
//
// Providers are not interchangeable, and the differences have legal
// consequences rather than cosmetic ones. YooKassa, T-Bank and Robokassa carry
// the fiscal receipt and the marking code inside the payment API itself;
// CloudPayments needs a separate cash-register product for the marking code.
// A merchant selling marked apparel through a provider that cannot carry the
// code will not be able to issue a valid receipt — and will find out at the
// first real order unless we say so first.
//
// These flags are declared by each adapter and stored on the connection, so
// the wizard can refuse an impossible combination and the preflight check can
// explain it in the merchant's terms.
type Capabilities struct {
	// CarriesReceipt — the provider can issue a fiscal receipt itself, so no
	// separate cash-register integration is needed.
	CarriesReceipt bool `json:"carries_receipt"`
	// CarriesMarkingCode — the provider accepts a Chestny Znak marking code
	// per line item. Required for merchants selling marked apparel.
	CarriesMarkingCode bool `json:"carries_marking_code"`
	// SupportsPartialRefund — refunds can be issued for part of an order.
	SupportsPartialRefund bool `json:"supports_partial_refund"`
	// SupportsSandbox — the provider offers test credentials, so the merchant
	// can walk the whole order path without moving real money.
	SupportsSandbox bool `json:"supports_sandbox"`
	// HostedCheckout — payment happens on the provider's page or in their
	// widget. Always true for us: we never render card fields.
	HostedCheckout bool `json:"hosted_checkout"`
}

// Missing returns the capabilities required by the merchant's situation that
// this provider does not have. The caller turns the result into an explanation
// rather than an error code.
func (c Capabilities) Missing(required Capabilities) []string {
	var missing []string
	if required.CarriesReceipt && !c.CarriesReceipt {
		missing = append(missing, "issuing a fiscal receipt")
	}
	if required.CarriesMarkingCode && !c.CarriesMarkingCode {
		missing = append(missing, "passing a marking code")
	}
	if required.SupportsPartialRefund && !c.SupportsPartialRefund {
		missing = append(missing, "partial refunds")
	}
	if required.SupportsSandbox && !c.SupportsSandbox {
		missing = append(missing, "a sandbox mode")
	}
	return missing
}

// Scan implements sql.Scanner for the jsonb column.
func (c *Capabilities) Scan(value any) error {
	if value == nil {
		*c = Capabilities{}
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return fmt.Errorf("capabilities: cannot scan %T", value)
	}
	if len(data) == 0 {
		*c = Capabilities{}
		return nil
	}
	return json.Unmarshal(data, c)
}

// Value implements driver.Valuer for the jsonb column.
func (c Capabilities) Value() (driver.Value, error) {
	return json.Marshal(c)
}
