import HttpError, { ServerError } from "../../helpers/HttpError.js";
import Order from "../../models/order.js";

function monthNameToNumber(monthName) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months.indexOf(monthName);
}

export const getLatestOrders = async (req, res, next) => {
  try {
    const daysAgo = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    console.log(startDate);

    const latestOrders = await Order.find({
      createdAt: { $gte: startDate },
      paymentStatus: true,
    })
      .sort({ createdAt: -1 })
      .populate("eventId")
      .exec();

    res.status(200).json({ message: "Latest orders", orders: latestOrders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrdersByTimeInterval = async (req, res, next) => {
  const { interval } = req.params;
  const { businessId } = req.query;
  const currentDate = new Date();

  let startDate;
  let orders = [];

  try {
    if (interval === "monthly") {
      const endDate = new Date(); // Today's date
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago from today

      const query = {
        paymentStatus: true,
        updatedAt: { $gte: startDate },
        updatedAt: { $lte: endDate },
      };

      if (businessId && businessId !== "undefined") {
        query.businessId = businessId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount"
      );

      const aggregatedOrders = {}; // Object to store aggregated order amounts by day

      // Initialize the aggregatedOrders object with 0 for each day within the date range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update aggregated order amounts based on the fetched orders
      foundOrders.forEach((order) => {
        const dayKey = order.updatedAt.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] += order.orderAmount;
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount,
        })
      );
    } else if (interval === "yearly") {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const endDate = new Date(); // Today's date
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 11); // 12 months ago from today

      const query = {
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (businessId && businessId !== "undefined") {
        query.businessId = businessId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount"
      );

      const aggregatedOrders = {}; // Object to store aggregated order amounts by month

      // Loop through the last 12 months and initialize aggregated order amounts
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthYear = currentDate.toISOString().substring(0, 7); // Format: YYYY-MM
        if (!aggregatedOrders[monthYear]) {
          aggregatedOrders[monthYear] = 0;
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Loop through each order and update aggregated order amounts by month
      foundOrders.forEach((order) => {
        const monthYear = order.updatedAt.toISOString().substring(0, 7); // Format: YYYY-MM
        if (!aggregatedOrders[monthYear]) {
          aggregatedOrders[monthYear] = 0;
        }
        aggregatedOrders[monthYear] += order.orderAmount;
      });

      orders = Object.entries(aggregatedOrders).map(
        ([monthYear, orderAmount]) => {
          const [year, month] = monthYear.split("-");
          const monthName = monthNames[parseInt(month, 10) - 1]; // Month is 0-indexed

          return {
            updatedAt: `${monthName} ${year}`,
            orderAmount,
          };
        }
      );
    } else if (interval === "weekly") {
      const endDate = new Date(); // Today's date
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago from today

      const query = {
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (businessId && businessId !== "undefined") {
        query.businessId = businessId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount"
      );

      const aggregatedOrders = {}; // Object to store aggregated order amounts by day

      // Initialize the aggregatedOrders object with 0 for each day within the date range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update aggregated order amounts based on the fetched orders
      foundOrders.forEach((order) => {
        const dayKey = order?.updatedAt.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] += order?.orderAmount;
      });

      orders = Object.entries(aggregatedOrders)?.map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount,
        })
      );
    } else if (interval === "daily") {
      startDate = new Date();
      const endDate = new Date(startDate); // Current date

      startDate.setHours(0, 0, 0, 0); // Set start time to midnight of the current day
      endDate.setDate(endDate.getDate() + 1);

      // Set end time to midnight of the next day
      endDate.setHours(0, 0, 0, 0);

      const query = {
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (businessId && businessId !== "undefined") {
        query.businessId = businessId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount"
      );

      const aggregatedOrders = {}; // Object to store aggregated order amounts by hour

      // Initialize the aggregatedOrders object with 0 for each hour within the date range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const hourKey = currentDate.toISOString(); // Format: YYYY-MM-DDTHH
        aggregatedOrders[hourKey] = 0;
        currentDate.setHours(currentDate.getHours() + 1);
      }

      // Update aggregated order amounts based on the fetched orders
      foundOrders.forEach((order) => {
        const hourKey = order.updatedAt.toISOString(); // Format: YYYY-MM-DDTHH
        aggregatedOrders[hourKey] += order.orderAmount;
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount,
        })
      );
    } else {
      return res.status(400).json({ message: "Invalid interval" });
    }

    res.status(200).json({ message: "Orders by interval", orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllOrdersByBusiness = async (req, res, next) => {
  const { businessId } = req.params;
  try {
    const latestOrdersQuery = {
      paymentStatus: true, // Always include paymentStatus: true in the query
    };

    // Include businessId in the query only if it's provided and not equal to 'undefined'
    if (businessId && businessId !== "undefined") {
      latestOrdersQuery.businessId = businessId;
    }

    const latestOrders = await Order.find(latestOrdersQuery)
      .sort({ _id: -1 })
      .populate("businessId")
      .exec();

    res
      .status(200)
      .json({ message: "Order by event id", orders: latestOrders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBusinessRevenueByMonth = async (req, res, next) => {
  const { month } = req.params;

  const currentYear = new Date().getFullYear();

  try {
    const data = await Order.aggregate([
      {
        $match: {
          paymentStatus: true,
          createdAt: {
            $gte: new Date(currentYear, monthNameToNumber(month), 1),
            $lt: new Date(currentYear, monthNameToNumber(month) + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalTicketsSold: { $sum: "$noOfTickets" },
          totalRevenue: { $sum: "$orderAmount" },
        },
      },
    ]).exec();

    res.status(200).json({ message: "revenue data", data });
  } catch (error) {
    console.error(month, error);
    res.status(500).json({ message: "Server error" });
  }
};
