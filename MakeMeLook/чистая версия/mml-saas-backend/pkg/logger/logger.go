package logger

import (
	"errors"
	"fmt"
	"log"
	"os"
	"runtime/debug"
	"strings"
)

type Level int

const (
	LevelDebug Level = iota
	LevelInfo
	LevelWarn
	LevelError
	LevelFatal
)

var level = LevelInfo
var includeStackTraces bool

// SetIncludeStackTraces controls whether Error and Fatal log entries include debug.Stack() output.
func SetIncludeStackTraces(v bool) {
	includeStackTraces = v
}

func Init(logLevel string) {
	switch strings.ToLower(logLevel) {
	case "debug":
		level = LevelDebug
	case "info":
		level = LevelInfo
	case "warn", "warning":
		level = LevelWarn
	case "error":
		level = LevelError
	case "fatal":
		level = LevelFatal
	default:
		level = LevelInfo
	}
	log.SetOutput(os.Stdout)
	log.SetFlags(log.Ldate | log.Ltime)
}

func Debug(component string, message string, keyvals ...any) {
	if level <= LevelDebug {
		logf("DEBUG", component, message, keyvals...)
	}
}

func Info(component string, message string, keyvals ...any) {
	if level <= LevelInfo {
		logf("INFO", component, message, keyvals...)
	}
}

func Warn(component string, message string, keyvals ...any) {
	if level <= LevelWarn {
		logf("WARN", component, message, keyvals...)
	}
}

func Error(component string, message string, keyvals ...any) {
	if level <= LevelError {
		logf("ERROR", component, message, keyvals...)
		if includeStackTraces {
			log.Printf("%s", debug.Stack())
		}
	}
}

func Fatal(component string, message string, keyvals ...any) {
	logf("FATAL", component, message, keyvals...)
	if includeStackTraces {
		log.Printf("%s", debug.Stack())
	}
	os.Exit(1)
}

// LogError logs the error with stack trace and returns it (nil-safe)
func LogError(err error) error {
	if err != nil {
		log.Printf("[ERROR] %v\n%s", err, debug.Stack())
	}
	return err
}

// LogErrorMsg creates an error from message, logs it, and returns it
func LogErrorMsg(message string) error {
	if message != "" {
		return LogError(errors.New(message))
	}
	return nil
}

// LogErrorD logs the error and returns both values — handy for wrapping two-return calls
func LogErrorD[K comparable](a K, err error) (K, error) {
	return a, LogError(err)
}

// LogPanic logs the error with stack trace and panics (nil-safe)
func LogPanic(err error) {
	if err != nil {
		log.Panicf("[FATAL] %v\n%s", err, debug.Stack())
	}
}

// LogPanicD logs the error, panics if non-nil, and returns the value
func LogPanicD[K comparable](a K, err error) K {
	if err != nil {
		LogPanic(err)
	}
	return a
}

func logf(lvl, component, message string, keyvals ...any) {
	var kvStr strings.Builder
	for i := 0; i < len(keyvals); i += 2 {
		if i+1 < len(keyvals) {
			kvStr.WriteString(" " + keyvals[i].(string) + "=" + formatValue(keyvals[i+1]))
		}
	}
	log.Printf("[%s] [%s] %s%s", lvl, component, message, kvStr.String())
}

func formatValue(v any) string {
	switch val := v.(type) {
	case string:
		return val
	case error:
		return val.Error()
	default:
		return fmt.Sprint(val)
	}
}
