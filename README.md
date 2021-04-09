# digital-wallet
This is a simple digital wallet API

> Base URL is: https://abeg-interview.herokuapp.com

>## ✨ Use cases covered

- User can create an account(Basic Information) - /api/auth/signup
  - user can login - /api/auth/signin
- User can fund their Account with Card or Bank Transfer. - /api/user/fund-account-bank-card
  - requires pin - /api/user/send_pin
  - requires otp - /api/user/send_otp
  - requires phone - /api/user/send_phone
- User can send money to another User. - /api/user/internal_transfer
- User can withdraw money to their Bank Account. - /api/user/withdraw

> 📝 NOTES
- increment and decrement was used to eliminate race condition
- Redis was used to cache jwt token, so as to manage user sessions
  - Use case for when a user logs out and generates another token by logging in, the old token is deleted from the redis cache making it invalid
- in a production enviroment, queue would have being implemented
- in a production enviroment, webhook will filter IP address.