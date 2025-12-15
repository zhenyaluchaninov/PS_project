package timeago

import (
    "time"
)

import "testing"

func check(t *testing.T, d time.Duration, result string) {
    start := time.Now()
    end := time.Now().Add(d)
    got, error := WithTime(start, end)
    if error == nil {
        if got != result {
            t.Errorf("Wrong result: %s", got)
        }
    }
}

func TestThreeHoursAgo(t *testing.T) {
    d, error := time.ParseDuration("-3h")
    if error == nil {
        check(t, d, "3 timmar sedan")
    }
}

func TestAnHourAgo(t *testing.T) {
    d, error := time.ParseDuration("-1.5h")
    if error == nil {
        check(t, d, "En timme sedan")
    }
}

func TestThreeMinutesAgo(t *testing.T) {
    d, error := time.ParseDuration("-3m")
    if error == nil {
        check(t, d, "3 minuter sedan")
    }
}

func TestAMinuteAgo(t *testing.T) {
    d, error := time.ParseDuration("-1.2m")
    if error == nil {
        check(t, d, "En minut sedan")
    }
}

func TestJustNow(t *testing.T) {
    d, error := time.ParseDuration("-1.2s")
    if error == nil {
        check(t, d, "Alldeles nyss")
    }
}

func TestFromNow(t *testing.T) {
    d, error := time.ParseDuration("-1.2m")
    if error == nil {
        end := time.Now().Add(d)
        got, err := FromNowWithTime(end)
        if err == nil {
            if got != "En minut sedan" {
                t.Errorf("Wrong result: %s", got)
            }
        }
    }
}

func TestFromNowWithString(t *testing.T) {
    d, error := time.ParseDuration("-1.2m")
    if error == nil {
        end := time.Now().Add(d)
        got, err := FromNowWithString(time.RFC3339, end.Format(time.RFC3339))
        if err == nil {
            if got != "En minut sedan" {
                t.Errorf("Wrong result: %s", got)
            }
        }
    }
}
