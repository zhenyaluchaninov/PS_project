// Package timeago provides a set of functions to return how much
// time has been passed between two dates.
package timeago

import (
    "errors"
    "fmt"
    "math"
    "time"
)

// DateAgoValues is an int
type DateAgoValues int

// Enumeration of date periods
const (
    SecondsAgo DateAgoValues = iota
    MinutesAgo
    HoursAgo
    DaysAgo
    WeeksAgo
    MonthsAgo
    YearsAgo
)

// FromNowWithTime takes a specific end Time value
// and the current Time to return how much has been passed
// between them.
func FromNowWithTime(end time.Time) (string, error) {

    return WithTime(time.Now(), end)
}

// FromNowWithString takes a specific layout as time
// format to parse the time string on end paramter to return
// how much time has been passed between the current time and
// the string representation of the time provided by user.
func FromNowWithString(layout, end string) (string, error) {

    t, e := time.Parse(layout, end)
    if e == nil {
        return WithTime(time.Now(), t)
    }

    err := errors.New("Invalid format")
    return "", err
}

// WithTime takes a specific start/end Time values
// and calculate how much time has been passed between them.
func WithTime(start, end time.Time) (string, error) {
    duration := start.Sub(end)
    return stringForDuration(duration), nil
}

// WithString takes a specific layout as time
// format to parse the time string on start/end parameter to return
// how much time has been passed between them.
func WithString(layout, start, end string) (string, error) {

    timeStart, e := time.Parse(layout, start)
    if e != nil {
        err := errors.New("Invalid start time format")
        return "", err
    }

    timeEnd, e := time.Parse(layout, end)
    if e != nil {
        err := errors.New("Invalid end time format")
        return "", err
    }

    duration := timeStart.Sub(timeEnd)
    return stringForDuration(duration), nil
}

func stringForDuration(duration time.Duration) string {
    if duration.Hours() < 24 {
        if duration.Hours() >= 1 {
            return localizedStringFor(HoursAgo, int(round(duration.Hours())))
        } else if duration.Minutes() >= 1 {
            return localizedStringFor(MinutesAgo, int(round(duration.Minutes())))
        } else {
            return localizedStringFor(SecondsAgo, int(round(duration.Seconds())))
        }
    } else {
        if duration.Hours() >= 8760 {
            years := duration.Hours() / 8760
            return localizedStringFor(YearsAgo, int(years))
        } else if duration.Hours() >= 730 {
            months := duration.Hours() / 730
            return localizedStringFor(MonthsAgo, int(months))
        } else if duration.Hours() >= 168 {
            weeks := duration.Hours() / 168
            return localizedStringFor(WeeksAgo, int(weeks))
        } else {
            days := duration.Hours() / 24
            return localizedStringFor(DaysAgo, int(days))
        }
    }
}

func round(f float64) float64 {
    return math.Floor(f + .5)
}

func localizedStringFor(valueType DateAgoValues, value int) string {

    switch valueType {
    case YearsAgo:
        if value >= 2 {
            return fmt.Sprintf("%d år sedan", value)
        }
        return "Förra året"

    case MonthsAgo:
        if value >= 2 {
            return fmt.Sprintf("%d månader sedan", value)
        }
        return "Förra månaden"

    case WeeksAgo:
        if value >= 2 {
            return fmt.Sprintf("%d veckor sedan", value)
        }
        return "Förra veckan"

    case DaysAgo:
        if value >= 2 {
            return fmt.Sprintf("%d dagar sedan", value)
        }
        return "Iförrgår"

    case HoursAgo:
        if value >= 2 {
            return fmt.Sprintf("%d timmar sedan", value)
        }
        return "En timme sedan"

    case MinutesAgo:
        if value >= 2 {
            return fmt.Sprintf("%d minuter sedan", value)
        }
        return "En minut sedan"

    case SecondsAgo:
        if value >= 2 {
            return fmt.Sprintf("%d sekunder sedan", value)
        }
        return "Alldeles nyss"

    }
    return ""
}
