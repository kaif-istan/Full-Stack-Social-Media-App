export const protect = (req, res, next) => {
    try {
        const {userId} = req.auth()
        if(!userId){
            return res.json({success: false, message: "Not authorized"})
        }
        next()
    } catch (error) {
        return res.status(401).json({success: false, message: error.message})
    }
}