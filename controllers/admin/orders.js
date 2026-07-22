import {
  convertToEurWithRates,
  getRatesFromEur,
  normalizeCurrency,
  roundMoney,
} from "../../helpers/currency.js";
import { PLATFORM_FEE_PERCENT } from "../../config/stripe.js";
import HttpError from "../../helpers/HttpError.js";
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

function amountInEur(order, field, rates) {
  return convertToEurWithRates(order[field], order.currency, rates);
}

/** Truncate a Date to the start of its local hour (stable bucket key). */
function toLocalHourBucket(dateInput) {
  const d = new Date(dateInput);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export const getLatestOrders = async (req, res, next) => {
  try {
    const daysAgo = Number(req.query.days) || 90;
    const { businessId } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const query = {
      createdAt: { $gte: startDate },
      paymentStatus: true,
    };

    if (businessId && businessId !== "undefined") {
      query.businessId = businessId;
    }

    const latestOrders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("eventId")
      .populate("businessId")
      .limit(200)
      .exec();

    res.status(200).json({ message: "Latest orders", orders: latestOrders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOrdersByTimeInterval = async (req, res, next) => {
  let { interval } = req.params;
  const { businessId } = req.query;

  // Admin UI uses "today"; backend aggregation key is "daily"
  if (interval === "today") {
    interval = "daily";
  }

  let startDate;
  let orders = [];

  try {
    const rates = await getRatesFromEur();

    if (interval === "monthly") {
      const endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const query = {
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (businessId && businessId !== "undefined") {
        query.businessId = businessId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount platformFeeAmount currency"
      );

      const aggregatedOrders = {};
      const aggregatedFees = {};

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] = 0;
        aggregatedFees[dayKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      foundOrders.forEach((order) => {
        const dayKey = order.updatedAt.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] += amountInEur(order, "orderAmount", rates);
        aggregatedFees[dayKey] += amountInEur(
          order,
          "platformFeeAmount",
          rates
        );
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount: roundMoney(orderAmount),
          platformFeeAmount: roundMoney(aggregatedFees[updatedAt] || 0),
          currency: "EUR",
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

      const endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 11);

      const query = {
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (businessId && businessId !== "undefined") {
        query.businessId = businessId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount platformFeeAmount currency"
      );

      const aggregatedOrders = {};
      const aggregatedFees = {};

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const monthYear = currentDate.toISOString().substring(0, 7);
        if (!aggregatedOrders[monthYear]) {
          aggregatedOrders[monthYear] = 0;
          aggregatedFees[monthYear] = 0;
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      foundOrders.forEach((order) => {
        const monthYear = order.updatedAt.toISOString().substring(0, 7);
        if (!aggregatedOrders[monthYear]) {
          aggregatedOrders[monthYear] = 0;
          aggregatedFees[monthYear] = 0;
        }
        aggregatedOrders[monthYear] += amountInEur(order, "orderAmount", rates);
        aggregatedFees[monthYear] += amountInEur(
          order,
          "platformFeeAmount",
          rates
        );
      });

      orders = Object.entries(aggregatedOrders).map(
        ([monthYear, orderAmount]) => {
          const [year, month] = monthYear.split("-");
          const monthName = monthNames[parseInt(month, 10) - 1];

          return {
            updatedAt: `${monthName} ${year}`,
            orderAmount: roundMoney(orderAmount),
            platformFeeAmount: roundMoney(aggregatedFees[monthYear] || 0),
            currency: "EUR",
          };
        }
      );
    } else if (interval === "weekly") {
      const endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const query = {
        paymentStatus: true,
        updatedAt: { $gte: startDate, $lte: endDate },
      };

      if (businessId && businessId !== "undefined") {
        query.businessId = businessId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt orderAmount platformFeeAmount currency"
      );

      const aggregatedOrders = {};
      const aggregatedFees = {};

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayKey = currentDate.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] = 0;
        aggregatedFees[dayKey] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      foundOrders.forEach((order) => {
        const dayKey = order?.updatedAt.toISOString().substring(0, 10);
        aggregatedOrders[dayKey] += amountInEur(order, "orderAmount", rates);
        aggregatedFees[dayKey] += amountInEur(
          order,
          "platformFeeAmount",
          rates
        );
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount: roundMoney(orderAmount),
          platformFeeAmount: roundMoney(aggregatedFees[updatedAt] || 0),
          currency: "EUR",
        })
      );
    } else if (interval === "daily") {
      startDate = new Date();
      const endDate = new Date(startDate);

      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(0, 0, 0, 0);

      const query = {
        paymentStatus: true,
        $or: [
          { updatedAt: { $gte: startDate, $lt: endDate } },
          { createdAt: { $gte: startDate, $lt: endDate } },
        ],
      };

      if (businessId && businessId !== "undefined") {
        query.businessId = businessId;
      }

      const foundOrders = await Order.find(query).select(
        "updatedAt createdAt orderAmount platformFeeAmount currency"
      );

      const aggregatedOrders = {};
      const aggregatedFees = {};

      const currentDate = new Date(startDate);
      while (currentDate < endDate) {
        const hourKey = toLocalHourBucket(currentDate);
        aggregatedOrders[hourKey] = 0;
        aggregatedFees[hourKey] = 0;
        currentDate.setHours(currentDate.getHours() + 1);
      }

      foundOrders.forEach((order) => {
        const when = order.updatedAt || order.createdAt;
        const hourKey = toLocalHourBucket(when);
        if (aggregatedOrders[hourKey] === undefined) return;
        aggregatedOrders[hourKey] += amountInEur(order, "orderAmount", rates);
        aggregatedFees[hourKey] += amountInEur(
          order,
          "platformFeeAmount",
          rates
        );
      });

      orders = Object.entries(aggregatedOrders).map(
        ([updatedAt, orderAmount]) => ({
          updatedAt,
          orderAmount: roundMoney(orderAmount),
          platformFeeAmount: roundMoney(aggregatedFees[updatedAt] || 0),
          currency: "EUR",
        })
      );
    } else {
      return res.status(400).json({ message: "Invalid interval" });
    }

    res
      .status(200)
      .json({ message: "Orders by interval", orders, currency: "EUR" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllOrdersByBusiness = async (req, res, next) => {
  const { businessId } = req.params;
  try {
    if (!businessId || businessId === "undefined") {
      return next(new HttpError("Invalid Id", 404));
    }

    const latestOrders = await Order.find({
      businessId,
      paymentStatus: true,
    })
      .sort({ _id: -1 })
      .populate("businessId")
      .populate("eventId")
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
  const { businessId } = req.query;
  const currentYear = new Date().getFullYear();

  try {
    const match = {
      paymentStatus: true,
      createdAt: {
        $gte: new Date(currentYear, monthNameToNumber(month), 1),
        $lt: new Date(currentYear, monthNameToNumber(month) + 1, 1),
      },
    };

    if (businessId && businessId !== "undefined") {
      match.businessId = businessId;
    }

    const rows = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$currency", "EUR"] },
          totalOrders: { $sum: 1 },
          totalTicketsSold: { $sum: "$noOfTickets" },
          totalRevenue: { $sum: "$orderAmount" },
          totalPlatformFees: { $sum: "$platformFeeAmount" },
          totalNetToBusiness: { $sum: "$netToBusiness" },
        },
      },
    ]).exec();

    const rates = await getRatesFromEur();

    let totalOrders = 0;
    let totalTicketsSold = 0;
    let totalRevenue = 0;
    let totalPlatformFees = 0;
    let totalNetToBusiness = 0;

    for (const row of rows) {
      const currency = normalizeCurrency(row._id);
      totalOrders += row.totalOrders || 0;
      totalTicketsSold += row.totalTicketsSold || 0;
      totalRevenue += convertToEurWithRates(
        row.totalRevenue,
        currency,
        rates
      );
      totalPlatformFees += convertToEurWithRates(
        row.totalPlatformFees,
        currency,
        rates
      );
      totalNetToBusiness += convertToEurWithRates(
        row.totalNetToBusiness,
        currency,
        rates
      );
    }

    const data = [
      {
        currency: "EUR",
        totalOrders,
        totalTicketsSold,
        totalRevenue: roundMoney(totalRevenue),
        totalPlatformFees: roundMoney(totalPlatformFees),
        totalNetToBusiness: roundMoney(totalNetToBusiness),
      },
    ];

    res.status(200).json({ message: "revenue data", data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Platform-wide finance totals for the admin Finance page.
 * Sales / Fees / Earnings across all paid orders (converted to EUR).
 */
export const getPlatformFinanceSummary = async (req, res, next) => {
  try {
    const { businessId } = req.query;

    const match = { paymentStatus: true };
    if (businessId && businessId !== "undefined") {
      match.businessId = businessId;
    }

    const rows = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ["$currency", "EUR"] },
          totalOrders: { $sum: 1 },
          totalSales: { $sum: { $ifNull: ["$orderAmount", 0] } },
          totalFees: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$platformFeeAmount", 0] }, 0] },
                "$platformFeeAmount",
                {
                  $round: [
                    { $multiply: [{ $ifNull: ["$orderAmount", 0] }, 0.08] },
                    2,
                  ],
                },
              ],
            },
          },
          totalEarnings: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ["$netToBusiness", 0] }, 0] },
                "$netToBusiness",
                {
                  $round: [
                    {
                      $subtract: [
                        { $ifNull: ["$orderAmount", 0] },
                        {
                          $cond: [
                            {
                              $gt: [{ $ifNull: ["$platformFeeAmount", 0] }, 0],
                            },
                            "$platformFeeAmount",
                            {
                              $round: [
                                {
                                  $multiply: [
                                    { $ifNull: ["$orderAmount", 0] },
                                    0.08,
                                  ],
                                },
                                2,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    2,
                  ],
                },
              ],
            },
          },
        },
      },
    ]);

    const rates = await getRatesFromEur();

    let totalOrders = 0;
    let totalSales = 0;
    let totalFees = 0;
    let totalEarnings = 0;

    for (const row of rows) {
      const currency = normalizeCurrency(row._id);
      totalOrders += row.totalOrders || 0;
      totalSales += convertToEurWithRates(row.totalSales, currency, rates);
      totalFees += convertToEurWithRates(row.totalFees, currency, rates);
      totalEarnings += convertToEurWithRates(
        row.totalEarnings,
        currency,
        rates
      );
    }

    return res.status(200).json({
      message: "Finance summary",
      data: {
        totalOrders,
        totalSales: roundMoney(totalSales),
        totalFees: roundMoney(totalFees),
        totalEarnings: roundMoney(totalEarnings),
        currency: "EUR",
        feePercent: PLATFORM_FEE_PERCENT,
      },
    });
  } catch (error) {
    console.error("getPlatformFinanceSummary", error);
    res.status(500).json({ message: "Server error" });
  }
};
