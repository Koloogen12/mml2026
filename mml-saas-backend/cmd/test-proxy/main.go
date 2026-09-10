package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"mml-saas-backend/pkg/proxy"
)

func main() {
	proxyURL := flag.String("proxy", os.Getenv("AI_PROXY_URL"), "http:// or socks5:// proxy URL")
	geminiKey := flag.String("gemini-key", os.Getenv("GEMINI_API_KEY"), "Gemini API key")
	timeoutSec := flag.Int("timeout", 30, "timeout seconds")
	flag.Parse()

	if *proxyURL == "" {
		fmt.Fprintln(os.Stderr, "ERROR: -proxy required (or set AI_PROXY_URL)")
		os.Exit(1)
	}

	timeout := time.Duration(*timeoutSec) * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	fmt.Println("=== Direct ===")
	directClient := &http.Client{Timeout: timeout}
	directIP, _ := fetchURL(ctx, directClient, "https://api.ipify.org?format=json")
	fmt.Printf("  IP: %s\n\n", directIP)

	fmt.Println("=== Building proxy client ===")
	proxyClient, err := proxy.NewHTTPClient(*proxyURL, timeout)
	if err != nil {
		fmt.Printf("  ERROR: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("  OK (proxy: %s)\n\n", *proxyURL)

	fmt.Println("=== HTTPS via proxy ===")
	t0 := time.Now()
	pIP, e443 := fetchURL(ctx, proxyClient, "https://api.ipify.org?format=json")
	fmt.Printf("  %v  ip=%s  err=%v\n", time.Since(t0).Round(time.Millisecond), pIP, e443)
	if e443 == nil {
		if pIP != directIP {
			fmt.Println("  IPs differ — proxy routing OK ✓")
		} else {
			fmt.Println("  IPs same — proxy NOT routing traffic ✗")
		}
	}

	if *geminiKey == "" {
		fmt.Println("\n(skipping Gemini — no -gemini-key)")
		return
	}

	fmt.Println("\n=== Gemini API via proxy ===")
	t0 = time.Now()
	req, _ := http.NewRequestWithContext(ctx, "GET",
		"https://generativelanguage.googleapis.com/v1beta/models?key="+*geminiKey, nil)
	resp, err := proxyClient.Do(req)
	if err != nil {
		fmt.Printf("  ERROR after %v: %v\n", time.Since(t0).Round(time.Millisecond), err)
		os.Exit(1)
	}
	rb, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode == 200 {
		var d struct {
			Models []struct{ Name string }
		}
		json.Unmarshal(rb, &d)
		fmt.Printf("  HTTP %d — %d models (%v) ✓\n",
			resp.StatusCode, len(d.Models), time.Since(t0).Round(time.Millisecond))
	} else {
		fmt.Printf("  HTTP %d: %.300s\n", resp.StatusCode, string(rb))
	}
}

func fetchURL(ctx context.Context, c *http.Client, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}
	resp, err := c.Do(req)
	if err != nil {
		return "", err
	}
	b, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		return "", err
	}
	var d struct {
		IP string `json:"ip"`
	}
	if json.Unmarshal(b, &d) == nil && d.IP != "" {
		return d.IP, nil
	}
	return string(b), nil
}
