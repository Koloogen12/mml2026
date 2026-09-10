// Package proxy provides an HTTP client that routes traffic through a proxy.
// Supports http://, https://, and socks5:// proxy URLs.
package proxy

import (
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// NewHTTPClient returns an *http.Client whose requests are routed through proxyURL.
// Supports http://, https://, and socks5:// schemes.
// If proxyURL is empty a plain client with the given timeout is returned.
func NewHTTPClient(proxyURL string, timeout time.Duration) (*http.Client, error) {
	if proxyURL == "" {
		return &http.Client{Timeout: timeout}, nil
	}

	u, err := url.Parse(proxyURL)
	if err != nil {
		return nil, fmt.Errorf("proxy: parse URL: %w", err)
	}

	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			Proxy: http.ProxyURL(u),
		},
	}, nil
}
