package email

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// Service sends transactional emails via SMTP.
// When Host is empty the email is printed to the log (development mode).
type Service struct {
	host     string
	port     string
	username string
	password string
	from     string
	useTLS   bool
}

func New(host, port, username, password, from string, useTLS bool) *Service {
	return &Service{
		host:     host,
		port:     port,
		username: username,
		password: password,
		from:     from,
		useTLS:   useTLS,
	}
}

// Send delivers a plain-text email. When SMTP is unconfigured it logs instead.
func (s *Service) Send(to, subject, body string) error {
	if s.host == "" {
		log.Printf("[EMAIL no-op] To=%s Subject=%q\n%s", to, subject, body)
		return nil
	}

	msg := "From: " + s.from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" + body

	addr := s.host + ":" + s.port

	if s.useTLS {
		return s.sendTLS(addr, to, msg)
	}

	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	return smtp.SendMail(addr, auth, s.from, []string{to}, []byte(msg))
}

func (s *Service) sendTLS(addr, to, msg string) error {
	tlsCfg := &tls.Config{ServerName: s.host, MinVersion: tls.VersionTLS12}
	conn, err := tls.Dial("tcp", addr, tlsCfg)
	if err != nil {
		return fmt.Errorf("email tls dial: %w", err)
	}

	client, err := smtp.NewClient(conn, s.host)
	if err != nil {
		return fmt.Errorf("email smtp client: %w", err)
	}
	defer client.Quit() //nolint:errcheck

	auth := smtp.PlainAuth("", s.username, s.password, s.host)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("email smtp auth: %w", err)
	}
	if err = client.Mail(s.from); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err = strings.NewReader(msg).WriteTo(w); err != nil {
		return err
	}
	return w.Close()
}
