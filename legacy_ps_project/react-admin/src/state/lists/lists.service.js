import constants from "../../config";

const getAllLists = () => new Promise(function(resolve, reject) {
    const opts = {
        method: "GET",
        headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
                }
    };

    fetch(constants.ADMINAPIURL + "/lists", opts)
    .then((response) => response.json())
    .then((data) => {
        if (data.error) throw new Error(data.error);
        if (data) { 
            resolve(data)
            return;
        }
        reject(data);
    }).catch((error)=>{
        reject(error.message);
    });
});

export default {
	getAllLists
};