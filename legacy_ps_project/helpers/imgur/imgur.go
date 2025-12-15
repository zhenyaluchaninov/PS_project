package imgur

import (
	"bytes"
	"errors"
	"net/http"
	"strconv"

	"github.com/mattn/go-scan"
	"golang.org/x/oauth2"
)

const (
	endpoint = "https://api.imgur.com/3/image"
)

// oauth configuration
var config = &oauth2.Config{
	ClientID: "16958ad0bd36ae8",
	Endpoint: oauth2.Endpoint{
		AuthURL:  "https://api.imgur.com/oauth2/authorize",
		TokenURL: "https://api.imgur.com/oauth2/token",
	},
}

func Delete(imageHash string, bearer *string) error {
	var res *http.Response

	req, err := http.NewRequest("DELETE", endpoint+"/"+imageHash, nil)
	if err != nil {
		//fmt.Fprintln(os.Stderr, "post:", err.Error())
		return errors.New("Post error 1: " + err.Error())
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Bearer "+*bearer)

	res, err = http.DefaultClient.Do(req)
	if err != nil {
		//fmt.Fprintln(os.Stderr, "post:", err.Error())
		return errors.New("Post error 2: " + err.Error())
	}

	if res.StatusCode != 200 {
		return errors.New("Post error: status code " + strconv.Itoa(res.StatusCode))
	}

	return nil
}

func Upload(imageContents []byte, bearer *string) (string, error) {
	var res *http.Response

	req, err := http.NewRequest("POST", endpoint, bytes.NewReader(imageContents))
	if err != nil {
		//fmt.Fprintln(os.Stderr, "post:", err.Error())
		return "", errors.New("Post error: " + err.Error())
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	if bearer == nil {
		req.Header.Set("Authorization", "Client-ID "+config.ClientID)
	} else {
		req.Header.Set("Authorization", "Bearer "+*bearer)
	}

	res, err = http.DefaultClient.Do(req)
	if err != nil {
		//fmt.Fprintln(os.Stderr, "post:", err.Error())
		return "", errors.New("Post error: " + err.Error())
	}

	if res.StatusCode != 200 {
		var message string
		err := scan.ScanJSON(res.Body, "data/error", &message)
		if err != nil {
			message = res.Status
			// fmt.Fprintln(os.Stderr, "post:", message)
			// fmt.Fprintln(os.Stderr, res)
			return "", errors.New("Post error: " + err.Error())
		}
	}
	defer res.Body.Close()

	var link string
	err = scan.ScanJSON(res.Body, "data/link", &link)
	if err != nil {
		//fmt.Fprintln(os.Stderr, "post:", err.Error())
		return "", errors.New("Post error: " + err.Error())
	}

	return link, nil
}
