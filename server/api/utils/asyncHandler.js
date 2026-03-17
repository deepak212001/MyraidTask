// const asyncHandler = (fun) => async (req, res, next) => {
//     try {
//         await fun(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }


// const asynchandler=() =>{()=>{}}
//  aur
// const asynchandler=() =>()=>{}


// in promise




const asyncHandler = (fun) => {
    return (req, res, next) => {
        Promise.resolve(fun(req, res, next)).
        catch ((err) => next(err))
    }
}

export { asyncHandler }