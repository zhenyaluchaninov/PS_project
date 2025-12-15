import constants from "../../config"

const getCategory = (categoryID) => {
    return new Promise(function(resolve, reject) {
        const opts = {
            method: "GET",
            headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                    }
        };

        fetch(constants.ADMINAPIURL + "/category/" + categoryID, opts)
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
};

const createCategory = (category) => {
    return new Promise(function(resolve, reject) {
        const opts = {
            method: "POST",
            headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                    },
            body: JSON.stringify(category)
        };

        fetch(constants.ADMINAPIURL + "/categories", opts)
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
};



const updateCategory = (category) => {
    return new Promise(function(resolve, reject) {
        const opts = {
            method: "PUT",
            headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                    },
            body: JSON.stringify(category)
        };

        fetch(constants.ADMINAPIURL + "/category/" + category.id, opts)
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
};

const deleteCategory = (categoryID) => {

    return new Promise(function(resolve, reject) {
        const opts = {
            method: "DELETE",
            headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                    }
        };

        fetch(constants.ADMINAPIURL + "/category/" + categoryID, opts)
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
};

export default {
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory
};